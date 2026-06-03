import { Module } from '@nestjs/common';
import { FocusController } from './focus.controller';
import { FocusService } from './focus.service';

@Module({
  controllers: [FocusController],
  providers: [FocusService],
  exports: [FocusService], // exported so AnalyticsModule can aggregate over focus sessions
})
export class FocusModule {}
