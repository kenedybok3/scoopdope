import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnnouncementsService } from './announcements.service';

class CreateAnnouncementDto {
  courseId: string;
  title: string;
  body: string;
}

@ApiTags('announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/announcements')
export class AnnouncementsController {
  constructor(private readonly service: AnnouncementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a course announcement (instructor)' })
  create(@Request() req, @Body() dto: CreateAnnouncementDto) {
    return this.service.create(req.user.id, dto.courseId, dto.title, dto.body);
  }

  @Get()
  @ApiOperation({ summary: 'List announcements for a course' })
  list(@Query('courseId') courseId: string) {
    return this.service.findByCourse(courseId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an announcement (instructor)' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }
}
