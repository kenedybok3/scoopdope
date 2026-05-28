import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto, UpdateNoteDto } from './note.dto';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1')
export class NotesController {
  constructor(private service: NotesService) {}

  @Get('lessons/:lessonId/notes')
  @ApiOperation({ summary: 'Get notes for a lesson' })
  @ApiQuery({ name: 'search', required: false })
  getByLesson(
    @Param('lessonId') lessonId: string,
    @Query('search') search: string,
    @CurrentUser() user: any,
  ) {
    return this.service.findByLesson(user.id, lessonId, search);
  }

  @Get('notes')
  @ApiOperation({ summary: 'Get all notes for the current user' })
  @ApiQuery({ name: 'search', required: false })
  getAll(@Query('search') search: string, @CurrentUser() user: any) {
    return this.service.findByUser(user.id, search);
  }

  @Post('lessons/:lessonId/notes')
  @ApiOperation({ summary: 'Create a note' })
  create(
    @Param('lessonId') lessonId: string,
    @Body() dto: CreateNoteDto,
    @CurrentUser() user: any,
  ) {
    return this.service.create(user.id, lessonId, dto);
  }

  @Patch('notes/:id')
  @ApiOperation({ summary: 'Update a note' })
  update(@Param('id') id: string, @Body() dto: UpdateNoteDto, @CurrentUser() user: any) {
    return this.service.update(id, user.id, dto);
  }

  @Delete('notes/:id')
  @ApiOperation({ summary: 'Delete a note' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user.id);
  }
}
