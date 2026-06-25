import { PartialType } from '@nestjs/mapped-types';
import { CreateBuyItemDto } from './create-buy-item.dto';

export class UpdateBuyItemDto extends PartialType(CreateBuyItemDto) {}
