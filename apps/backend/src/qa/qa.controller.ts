import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { QaService } from './qa.service';

class AskQuestionDto {
  courseId: string;
  body: string;
  timestampSeconds?: number;
  instructorId?: string;
}

class AnswerQuestionDto {
  answer: string;
}

@ApiTags('qa')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/qa')
export class QaController {
  constructor(private readonly service: QaService) {}

  @Post()
  @ApiOperation({ summary: 'Ask a question in a course' })
  ask(@Request() req, @Body() dto: AskQuestionDto) {
    return this.service.ask(
      req.user.id,
      dto.courseId,
      dto.body,
      dto.timestampSeconds,
      dto.instructorId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'List questions for a course' })
  list(@Query('courseId') courseId: string) {
    return this.service.findByCourse(courseId);
  }

  @Patch(':id/answer')
  @ApiOperation({ summary: 'Answer a question (instructor)' })
  answer(@Request() req, @Param('id') id: string, @Body() dto: AnswerQuestionDto) {
    return this.service.answer(id, req.user.id, dto.answer);
  }

  @Patch(':id/upvote')
  @ApiOperation({ summary: 'Upvote a question' })
  upvote(@Param('id') id: string) {
    return this.service.upvote(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete own question' })
  remove(@Request() req, @Param('id') id: string) {
    return this.service.remove(id, req.user.id);
  }
}
