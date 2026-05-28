import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LiveSession, SessionStatus } from './live-session.entity';
import { CohortMember } from '../cohorts/cohort-member.entity';
import { User } from '../users/user.entity';
import { CreateLiveSessionDto, UpdateLiveSessionDto } from './live-session.dto';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LiveSessionsService {
  private readonly logger = new Logger(LiveSessionsService.name);

  constructor(
    @InjectRepository(LiveSession) private repo: Repository<LiveSession>,
    @InjectRepository(CohortMember) private memberRepo: Repository<CohortMember>,
    @InjectRepository(User) private userRepo: Repository<User>,
    private emailService: EmailService,
    private config: ConfigService,
  ) {}

  findByCohort(cohortId: string): Promise<LiveSession[]> {
    return this.repo.find({ where: { cohortId }, order: { scheduledAt: 'ASC' } });
  }

  async findOne(id: string): Promise<LiveSession> {
    const session = await this.repo.findOne({ where: { id } });
    if (!session) throw new NotFoundException('Live session not found');
    return session;
  }

  async create(cohortId: string, instructorId: string, dto: CreateLiveSessionDto): Promise<LiveSession> {
    const session = this.repo.create({
      cohortId,
      instructorId,
      ...dto,
      scheduledAt: new Date(dto.scheduledAt),
    });
    const saved = await this.repo.save(session);
    await this.sendCalendarInvites(saved);
    return saved;
  }

  async update(id: string, instructorId: string, dto: UpdateLiveSessionDto): Promise<LiveSession> {
    const session = await this.findOne(id);
    if (session.instructorId !== instructorId) throw new ForbiddenException();
    if (dto.scheduledAt) (dto as any).scheduledAt = new Date(dto.scheduledAt);
    Object.assign(session, dto);
    return this.repo.save(session);
  }

  async cancel(id: string, instructorId: string): Promise<LiveSession> {
    const session = await this.findOne(id);
    if (session.instructorId !== instructorId) throw new ForbiddenException();
    session.status = SessionStatus.CANCELLED;
    return this.repo.save(session);
  }

  // ── Reminders ─────────────────────────────────────────────────────────────

  @Cron(CronExpression.EVERY_MINUTE)
  async sendReminders(): Promise<void> {
    const now = new Date();
    const upcoming = await this.repo.find({
      where: { status: SessionStatus.SCHEDULED, scheduledAt: MoreThan(now) },
    });

    for (const session of upcoming) {
      const msUntil = session.scheduledAt.getTime() - now.getTime();
      const hoursUntil = msUntil / 3_600_000;
      const sent = session.remindersSent ?? [];

      const toSend: string[] = [];
      if (hoursUntil <= 24 && hoursUntil > 23 && !sent.includes('24h')) toSend.push('24h');
      if (hoursUntil <= 1 && hoursUntil > 0 && !sent.includes('1h')) toSend.push('1h');

      for (const label of toSend) {
        await this.notifyMembers(session, label);
        sent.push(label);
      }

      if (toSend.length) {
        session.remindersSent = sent;
        await this.repo.save(session);
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async getMembers(cohortId: string): Promise<User[]> {
    const members = await this.memberRepo.find({ where: { cohortId } });
    if (!members.length) return [];
    return this.userRepo.findByIds(members.map((m) => m.userId));
  }

  private async sendCalendarInvites(session: LiveSession): Promise<void> {
    const users = await this.getMembers(session.cohortId);
    const frontendUrl = this.config.get<string>('frontend.url');
    const icsContent = this.buildIcs(session, frontendUrl);

    for (const user of users) {
      await this.emailService.enqueue(
        user.email,
        `📅 Live Session: ${session.title}`,
        this.calendarInviteHtml(session, user.username ?? user.email, frontendUrl, icsContent),
      );
    }
    this.logger.log(`Calendar invites sent for session "${session.title}" to ${users.length} member(s)`);
  }

  private async notifyMembers(session: LiveSession, label: string): Promise<void> {
    const users = await this.getMembers(session.cohortId);
    const frontendUrl = this.config.get<string>('frontend.url');
    const timeLabel = label === '24h' ? '24 hours' : '1 hour';

    for (const user of users) {
      await this.emailService.enqueue(
        user.email,
        `⏰ Reminder: "${session.title}" starts in ${timeLabel}`,
        this.reminderHtml(session, user.username ?? user.email, timeLabel, frontendUrl),
      );
    }
    this.logger.log(`${label} reminders sent for session "${session.title}" to ${users.length} member(s)`);
  }

  private buildIcs(session: LiveSession, frontendUrl: string): string {
    const start = session.scheduledAt.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(session.scheduledAt.getTime() + session.durationMinutes * 60_000)
      .toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const uid = `${session.id}@scoopdope`;
    const location = session.meetingUrl ?? `${frontendUrl}/live-sessions/${session.id}`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//scoopdope//EN',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${session.title}`,
      `DESCRIPTION:${session.description ?? ''}`,
      `LOCATION:${location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  private calendarInviteHtml(session: LiveSession, name: string, frontendUrl: string, ics: string): string {
    const date = session.scheduledAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>📅 You're invited to a live session</h2>
        <p>Hi ${name},</p>
        <p><strong>${session.title}</strong> has been scheduled.</p>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          <li><strong>Duration:</strong> ${session.durationMinutes} minutes</li>
          ${session.meetingUrl ? `<li><strong>Join:</strong> <a href="${session.meetingUrl}">${session.meetingUrl}</a></li>` : ''}
        </ul>
        <p>Add to your calendar using the attached .ics file.</p>
        <a href="${frontendUrl}/live-sessions/${session.id}" style="background:#4F46E5;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Session</a>
      </div>`;
  }

  private reminderHtml(session: LiveSession, name: string, timeLabel: string, frontendUrl: string): string {
    const date = session.scheduledAt.toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>⏰ Session starting in ${timeLabel}</h2>
        <p>Hi ${name},</p>
        <p><strong>${session.title}</strong> starts in ${timeLabel}.</p>
        <ul>
          <li><strong>Date:</strong> ${date}</li>
          ${session.meetingUrl ? `<li><strong>Join:</strong> <a href="${session.meetingUrl}">${session.meetingUrl}</a></li>` : ''}
        </ul>
        <a href="${session.meetingUrl ?? `${frontendUrl}/live-sessions/${session.id}`}" style="background:#059669;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Join Now</a>
      </div>`;
  }
}
