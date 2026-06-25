import { Module } from '@nestjs/common';
import { BuyListController } from './buy-list.controller';
import { BuyListService } from './buy-list.service';

@Module({
  controllers: [BuyListController],
  providers: [BuyListService],
})
export class BuyListModule {}
