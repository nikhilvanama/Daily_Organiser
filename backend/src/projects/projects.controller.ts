import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.projectsService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.projectsService.findOne(userId, id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateProjectDto) {
    return this.projectsService.create(userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.projectsService.remove(userId, id);
  }

  // --- Payments ---

  @Post(':id/payments')
  addPayment(
    @CurrentUser('id') userId: string,
    @Param('id') projectId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.projectsService.addPayment(userId, projectId, dto);
  }

  @Delete(':projectId/payments/:paymentId')
  removePayment(
    @CurrentUser('id') userId: string,
    @Param('projectId') projectId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.projectsService.removePayment(userId, projectId, paymentId);
  }
}
