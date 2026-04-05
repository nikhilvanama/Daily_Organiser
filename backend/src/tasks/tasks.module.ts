import { Module } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { GoogleCalendarModule } from '../google-calendar/google-calendar.module';

@Module({
  imports: [GoogleCalendarModule],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
