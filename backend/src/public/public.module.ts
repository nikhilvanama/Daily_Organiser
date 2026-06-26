import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { PortfolioModule } from '../portfolio/portfolio.module';

@Module({ imports: [PortfolioModule], controllers: [PublicController] })
export class PublicModule {}
