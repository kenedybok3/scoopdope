import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { DownloadsService } from './downloads.service';

class QueueDownloadDto {
  courseId: string;
  lessonId?: string;
  lessonTitle?: string;
  fileUrl?: string;
  fileSizeBytes?: number;
}

@ApiTags('downloads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/downloads')
export class DownloadsController {
  constructor(private readonly service: DownloadsService) {}

  @Post()
  @ApiOperation({ summary: 'Queue a lesson/course for offline download' })
  queue(@Request() req, @Body() dto: QueueDownloadDto) {
    return this.service.queueDownload(
      req.user.id,
      dto.courseId,
      dto.lessonId,
      dto.lessonTitle,
      dto.fileUrl,
      dto.fileSizeBytes,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List all downloads for the current user' })
  list(@Request() req) {
    return this.service.findByUser(req.user.id);
  }

  @Get('storage')
  @ApiOperation({ summary: 'Get storage usage stats' })
  storage(@Request() req) {
    return this.service.getStorageStats(req.user.id);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Mark a download as completed' })
  complete(@Request() req, @Param('id') id: string) {
    return this.service.markCompleted(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a downloaded item' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }
}
