import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { BuyListService } from './buy-list.service';
import { CreateBuyItemDto } from './dto/create-buy-item.dto';
import { UpdateBuyItemDto } from './dto/update-buy-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('buy-list')
export class BuyListController {
  constructor(private buyListService: BuyListService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.buyListService.findAll(userId);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.buyListService.findOne(userId, id);
  }

  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateBuyItemDto) {
    return this.buyListService.create(userId, dto);
  }

  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateBuyItemDto) {
    return this.buyListService.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.buyListService.remove(userId, id);
  }
}
