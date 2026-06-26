import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { UpsertBasicsDto } from './dto/upsert-basics.dto';
import { UpsertSettingsDto } from './dto/upsert-settings.dto';
import { CreateSocialDto } from './dto/create-social.dto';
import { CreateSkillDto } from './dto/create-skill.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { CreateAchievementDto } from './dto/create-achievement.dto';

const DEFAULT_SETTINGS = {
  theme: 'classic',
  accentColor: '#10b981',
  showSections: { skills: true, education: true, experience: true, certifications: true, achievements: true, interests: true, projects: true },
};

@Injectable()
export class PortfolioService {
  constructor(private firebase: FirebaseService) {}

  // ---------- Full read (authenticated) ----------
  async getMyPortfolio(userId: string) {
    const [basics, settings, rawInterests, socials, skills, education, experience, certifications, achievements] = await Promise.all([
      this.firebase.get<any>(`portfolios/${userId}/basics`),
      this.firebase.get<any>(`portfolios/${userId}/settings`),
      this.firebase.get<any>(`portfolios/${userId}/interests`),
      this.firebase.getList<any>(`portfolios/${userId}/socials`),
      this.firebase.getList<any>(`portfolios/${userId}/skills`),
      this.firebase.getList<any>(`portfolios/${userId}/education`),
      this.firebase.getList<any>(`portfolios/${userId}/experience`),
      this.firebase.getList<any>(`portfolios/${userId}/certifications`),
      this.firebase.getList<any>(`portfolios/${userId}/achievements`),
    ]);
    return {
      basics: basics ?? {},
      settings: settings ?? DEFAULT_SETTINGS,
      interests: Array.isArray(rawInterests) ? rawInterests : rawInterests ? Object.values(rawInterests) : [],
      socials: socials.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
      skills: skills.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
      education: education.sort((a: any, b: any) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
      experience: experience.sort((a: any, b: any) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
      certifications: certifications.sort((a: any, b: any) => (b.issuedDate ?? '').localeCompare(a.issuedDate ?? '')),
      achievements: achievements.sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '')),
    };
  }

  // ---------- Basics ----------
  async upsertBasics(userId: string, dto: UpsertBasicsDto) {
    const existing = await this.firebase.get<any>(`portfolios/${userId}/basics`);
    const oldSlug = existing?.slug;
    const patch: any = { ...(existing ?? {}), ...dto, updatedAt: new Date().toISOString() };
    await this.firebase.ref(`portfolios/${userId}/basics`).set(patch);
    // Maintain slug index for public lookup
    if (dto.slug && dto.slug !== oldSlug) {
      if (oldSlug) await this.firebase.remove(`portfolioSlugs/${oldSlug}`);
      await this.firebase.ref(`portfolioSlugs/${dto.slug}`).set(userId);
    }
    return patch;
  }

  // ---------- Settings ----------
  async upsertSettings(userId: string, dto: UpsertSettingsDto) {
    const existing = await this.firebase.get<any>(`portfolios/${userId}/settings`);
    const patch = { ...(existing ?? DEFAULT_SETTINGS), ...dto, updatedAt: new Date().toISOString() };
    if (dto.showSections) patch.showSections = { ...(existing?.showSections ?? DEFAULT_SETTINGS.showSections), ...dto.showSections };
    await this.firebase.ref(`portfolios/${userId}/settings`).set(patch);
    return patch;
  }

  // ---------- Interests ----------
  async upsertInterests(userId: string, items: string[]) {
    await this.firebase.ref(`portfolios/${userId}/interests`).set(items.length > 0 ? items : null);
    return items;
  }

  // ---------- Generic CRUD helpers ----------
  private async addItem(userId: string, collection: string, data: any) {
    const id = randomUUID();
    const record = { ...data, id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    await this.firebase.ref(`portfolios/${userId}/${collection}/${id}`).set(record);
    return record;
  }

  private async updateItem(userId: string, collection: string, id: string, data: any) {
    const existing = await this.firebase.get<any>(`portfolios/${userId}/${collection}/${id}`);
    if (!existing) throw new NotFoundException(`${collection} item not found`);
    const patch: any = {};
    for (const [k, v] of Object.entries(data)) { if (v !== undefined) patch[k] = v; }
    await this.firebase.update(`portfolios/${userId}/${collection}/${id}`, patch);
    return { ...existing, ...patch };
  }

  private async removeItem(userId: string, collection: string, id: string) {
    const existing = await this.firebase.get<any>(`portfolios/${userId}/${collection}/${id}`);
    if (!existing) throw new NotFoundException(`${collection} item not found`);
    await this.firebase.remove(`portfolios/${userId}/${collection}/${id}`);
    return { deleted: true };
  }

  // ---------- Socials ----------
  addSocial(userId: string, dto: CreateSocialDto) { return this.addItem(userId, 'socials', dto); }
  updateSocial(userId: string, id: string, dto: Partial<CreateSocialDto>) { return this.updateItem(userId, 'socials', id, dto); }
  removeSocial(userId: string, id: string) { return this.removeItem(userId, 'socials', id); }

  // ---------- Skills ----------
  addSkill(userId: string, dto: CreateSkillDto) { return this.addItem(userId, 'skills', dto); }
  updateSkill(userId: string, id: string, dto: Partial<CreateSkillDto>) { return this.updateItem(userId, 'skills', id, dto); }
  removeSkill(userId: string, id: string) { return this.removeItem(userId, 'skills', id); }

  // ---------- Education ----------
  addEducation(userId: string, dto: CreateEducationDto) { return this.addItem(userId, 'education', dto); }
  updateEducation(userId: string, id: string, dto: Partial<CreateEducationDto>) { return this.updateItem(userId, 'education', id, dto); }
  removeEducation(userId: string, id: string) { return this.removeItem(userId, 'education', id); }

  // ---------- Experience ----------
  addExperience(userId: string, dto: CreateExperienceDto) { return this.addItem(userId, 'experience', dto); }
  updateExperience(userId: string, id: string, dto: Partial<CreateExperienceDto>) { return this.updateItem(userId, 'experience', id, dto); }
  removeExperience(userId: string, id: string) { return this.removeItem(userId, 'experience', id); }

  // ---------- Certifications ----------
  addCertification(userId: string, dto: CreateCertificationDto) { return this.addItem(userId, 'certifications', dto); }
  updateCertification(userId: string, id: string, dto: Partial<CreateCertificationDto>) { return this.updateItem(userId, 'certifications', id, dto); }
  removeCertification(userId: string, id: string) { return this.removeItem(userId, 'certifications', id); }

  // ---------- Achievements ----------
  addAchievement(userId: string, dto: CreateAchievementDto) { return this.addItem(userId, 'achievements', dto); }
  updateAchievement(userId: string, id: string, dto: Partial<CreateAchievementDto>) { return this.updateItem(userId, 'achievements', id, dto); }
  removeAchievement(userId: string, id: string) { return this.removeItem(userId, 'achievements', id); }

  // ---------- Public portfolio ----------
  async getPublic(slug: string) {
    const userId = await this.firebase.get<string>(`portfolioSlugs/${slug}`);
    if (!userId) throw new NotFoundException('Portfolio not found');
    const basics = await this.firebase.get<any>(`portfolios/${userId}/basics`);
    if (!basics?.published) throw new NotFoundException('Portfolio not published');

    const [settings, rawInterests, socials, skills, education, experience, certifications, achievements, allProjects] = await Promise.all([
      this.firebase.get<any>(`portfolios/${userId}/settings`),
      this.firebase.get<any>(`portfolios/${userId}/interests`),
      this.firebase.getList<any>(`portfolios/${userId}/socials`),
      this.firebase.getList<any>(`portfolios/${userId}/skills`),
      this.firebase.getList<any>(`portfolios/${userId}/education`),
      this.firebase.getList<any>(`portfolios/${userId}/experience`),
      this.firebase.getList<any>(`portfolios/${userId}/certifications`),
      this.firebase.getList<any>(`portfolios/${userId}/achievements`),
      this.firebase.getList<any>('projects'),
    ]);

    const portfolioProjects = allProjects
      .filter((p: any) => p.userId === userId && p.showInPortfolio && !p.archived)
      .map((p: any) => ({
        id: p.id, title: p.title, publicSummary: p.publicSummary ?? p.description, thumbnailUrl: p.thumbnailUrl ?? null,
        liveUrl: p.liveUrl ?? null, repoUrl: p.repoUrl ?? null, figmaUrl: p.figmaUrl ?? null,
        tags: p.tags ?? [], projectType: p.projectType ?? null, status: p.status,
        startDate: p.startDate ?? null, deadline: p.deadline ?? null,
      }));

    const interests = Array.isArray(rawInterests) ? rawInterests : rawInterests ? Object.values(rawInterests) : [];

    return {
      basics,
      settings: settings ?? DEFAULT_SETTINGS,
      interests,
      socials: socials.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
      skills: skills.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
      education: education.sort((a: any, b: any) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
      experience: experience.sort((a: any, b: any) => (b.startDate ?? '').localeCompare(a.startDate ?? '')),
      certifications: certifications.sort((a: any, b: any) => (b.issuedDate ?? '').localeCompare(a.issuedDate ?? '')),
      achievements: achievements.sort((a: any, b: any) => (b.date ?? '').localeCompare(a.date ?? '')),
      projects: portfolioProjects,
    };
  }
}
