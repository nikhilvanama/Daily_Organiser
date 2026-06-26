import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Request } from '@nestjs/common';
import { PortfolioService } from './portfolio.service';
import { UpsertBasicsDto } from './dto/upsert-basics.dto';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { CreateSocialDto } from './dto/create-social.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';

@Controller('portfolio')
export class PortfolioController {
  constructor(private svc: PortfolioService) {}

  @Get() getMyPortfolio(@Request() req: any) { return this.svc.getMyPortfolio(req.user.sub); }

  @Put('basics') upsertBasics(@Request() req: any, @Body() dto: UpsertBasicsDto) { return this.svc.upsertBasics(req.user.sub, dto); }
  @Put('settings') upsertSettings(@Request() req: any, @Body() dto: UpsertSettingsDto) { return this.svc.upsertSettings(req.user.sub, dto); }
  @Put('interests') upsertInterests(@Request() req: any, @Body('items') items: string[]) { return this.svc.upsertInterests(req.user.sub, items ?? []); }

  @Post('socials') addSocial(@Request() req: any, @Body() dto: CreateSocialDto) { return this.svc.addSocial(req.user.sub, dto); }
  @Patch('socials/:id') updateSocial(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateSocialDto>) { return this.svc.updateSocial(req.user.sub, id, dto); }
  @Delete('socials/:id') removeSocial(@Request() req: any, @Param('id') id: string) { return this.svc.removeSocial(req.user.sub, id); }

  @Post('skills') addSkill(@Request() req: any, @Body() dto: CreateSkillDto) { return this.svc.addSkill(req.user.sub, dto); }
  @Patch('skills/:id') updateSkill(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateSkillDto>) { return this.svc.updateSkill(req.user.sub, id, dto); }
  @Delete('skills/:id') removeSkill(@Request() req: any, @Param('id') id: string) { return this.svc.removeSkill(req.user.sub, id); }

  @Post('education') addEducation(@Request() req: any, @Body() dto: CreateEducationDto) { return this.svc.addEducation(req.user.sub, dto); }
  @Patch('education/:id') updateEducation(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateEducationDto>) { return this.svc.updateEducation(req.user.sub, id, dto); }
  @Delete('education/:id') removeEducation(@Request() req: any, @Param('id') id: string) { return this.svc.removeEducation(req.user.sub, id); }

  @Post('experience') addExperience(@Request() req: any, @Body() dto: CreateExperienceDto) { return this.svc.addExperience(req.user.sub, dto); }
  @Patch('experience/:id') updateExperience(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateExperienceDto>) { return this.svc.updateExperience(req.user.sub, id, dto); }
  @Delete('experience/:id') removeExperience(@Request() req: any, @Param('id') id: string) { return this.svc.removeExperience(req.user.sub, id); }

  @Post('certifications') addCertification(@Request() req: any, @Body() dto: CreateCertificationDto) { return this.svc.addCertification(req.user.sub, dto); }
  @Patch('certifications/:id') updateCertification(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateCertificationDto>) { return this.svc.updateCertification(req.user.sub, id, dto); }
  @Delete('certifications/:id') removeCertification(@Request() req: any, @Param('id') id: string) { return this.svc.removeCertification(req.user.sub, id); }

  @Post('achievements') addAchievement(@Request() req: any, @Body() dto: CreateAchievementDto) { return this.svc.addAchievement(req.user.sub, dto); }
  @Patch('achievements/:id') updateAchievement(@Request() req: any, @Param('id') id: string, @Body() dto: Partial<CreateAchievementDto>) { return this.svc.updateAchievement(req.user.sub, id, dto); }
  @Delete('achievements/:id') removeAchievement(@Request() req: any, @Param('id') id: string) { return this.svc.removeAchievement(req.user.sub, id); }
}
