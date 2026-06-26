import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PortfolioService } from '../portfolio/portfolio.service';

@Controller('public')
export class PublicController {
  constructor(private portfolioSvc: PortfolioService) {}

  @Public()
  @Get('portfolio/:slug')
  getPortfolio(@Param('slug') slug: string) {
    return this.portfolioSvc.getPublic(slug);
  }
}
