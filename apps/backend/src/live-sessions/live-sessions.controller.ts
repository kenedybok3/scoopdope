import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { LiveSessionsService } from './live-sessions.service';
import { CreateLiveSessionDto, UpdateLiveSessionDto } from './live-session.dto';

@ApiTags('live-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/cohorts/:cohortId/live-sessions')
export class LiveSessionsController {
  constructor(private service: LiveSessionsService) {}

  @Get()
  @ApiOperation({ summary: 'List live sessions for a cohort' })
  list(@Param('cohortId') cohortId: string) {
    return this.service.findByCohort(cohortId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Schedule a live session' })
  create(
    @Param('cohortId') cohortId: string,
    @Body() dto: CreateLiveSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.create(cohortId, user.id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Update a live session' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateLiveSessionDto,
    @CurrentUser() user: any,
  ) {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('instructor', 'admin')
  @ApiOperation({ summary: 'Cancel a live session' })
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.cancel(id, user.id);
  }
}
