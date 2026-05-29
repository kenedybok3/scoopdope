import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';
import { DISK_HEALTH_THRESHOLD_PERCENT } from '../health.constants';

@Injectable()
export class DiskHealthIndicator extends HealthIndicator {
  async check(key: string): Promise<HealthIndicatorResult> {
    try {
      const diskInfo = await this.getDiskInfo();
      const usagePercent = (diskInfo.used / diskInfo.total) * 100;
      const healthy = usagePercent < DISK_HEALTH_THRESHOLD_PERCENT * 100;

      if (healthy) {
        return this.getStatus(key, true, {
          totalBytes: diskInfo.total,
          freeBytes: diskInfo.free,
          usedBytes: diskInfo.used,
          usagePercent: Math.round(usagePercent * 100) / 100,
          threshold: DISK_HEALTH_THRESHOLD_PERCENT * 100,
        });
      }

      throw new HealthCheckError(
        'Disk usage exceeds threshold',
        this.getStatus(key, false, {
          totalBytes: diskInfo.total,
          freeBytes: diskInfo.free,
          usedBytes: diskInfo.used,
          usagePercent: Math.round(usagePercent * 100) / 100,
          threshold: DISK_HEALTH_THRESHOLD_PERCENT * 100,
        }),
      );
    } catch (error: any) {
      if (error instanceof HealthCheckError) throw error;
      throw new HealthCheckError(
        'Disk health check failed',
        this.getStatus(key, false, { message: error.message }),
      );
    }
  }

  private async getDiskInfo(): Promise<{ total: number; free: number; used: number }> {
    const os = await import('os');
    const total = os.totalmem();
    const free = os.freemem();
    return { total, free, used: total - free };
  }
}
