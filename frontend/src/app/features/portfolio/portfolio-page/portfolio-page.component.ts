import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PortfolioService } from '../portfolio.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  MyPortfolio,
  PortfolioBasics,
  PortfolioSettings,
  PortfolioSocial,
  PortfolioSkill,
  PortfolioEducation,
  PortfolioExperience,
  PortfolioCertification,
  PortfolioAchievement,
  SKILL_CATEGORIES,
  SKILL_LEVELS,
  EXPERIENCE_TYPES,
  SOCIAL_PLATFORMS,
} from '../../../core/models/portfolio.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-portfolio-page',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="portfolio-page">
      <div class="page-header">
        <div>
          <h1 class="page-title">My Portfolio</h1>
          <p class="page-subtitle">Build and manage your public developer portfolio</p>
        </div>
        @if (portfolio()?.basics?.published) {
          <span class="published-badge">Published</span>
        } @else {
          <span class="draft-badge">Draft</span>
        }
      </div>

      <div class="portfolio-layout">
        <!-- Left: Tab list -->
        <nav class="tab-nav">
          @for (tab of tabs; track tab.id) {
            <button class="tab-btn" [class.active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)">
              <span class="tab-icon" [innerHTML]="tab.icon"></span>
              <span>{{ tab.label }}</span>
            </button>
          }
        </nav>

        <!-- Right: Section content -->
        <div class="tab-content">
          @if (!portfolio() && loading) {
            <div class="loading-state">Loading portfolio data...</div>
          }

          <!-- BASICS -->
          @if (activeTab() === 'basics' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Basic Information</h2>
              <p class="section-desc">Your public profile details and contact information</p>
              <div class="form-grid">
                <div class="form-group full">
                  <label class="label">Full name</label>
                  <input class="input" [(ngModel)]="basics.name" placeholder="e.g. Nikhil V" />
                </div>
                <div class="form-group full">
                  <label class="label">Headline</label>
                  <input class="input" [(ngModel)]="basics.headline" placeholder="e.g. Full-Stack Developer & UI Designer" />
                </div>
                <div class="form-group full">
                  <label class="label">Bio</label>
                  <textarea class="input" [(ngModel)]="basics.bio" rows="4" placeholder="Write a short bio about yourself..."></textarea>
                </div>
                <div class="form-group">
                  <label class="label">Avatar URL</label>
                  <input class="input" [(ngModel)]="basics.avatar" placeholder="https://..." />
                </div>
                <div class="form-group">
                  <label class="label">Location</label>
                  <input class="input" [(ngModel)]="basics.location" placeholder="City, Country" />
                </div>
                <div class="form-group">
                  <label class="label">Email</label>
                  <input class="input" type="email" [(ngModel)]="basics.email" placeholder="you@example.com" />
                </div>
                <div class="form-group">
                  <label class="label">Phone</label>
                  <input class="input" [(ngModel)]="basics.phone" placeholder="+91 98765 43210" />
                </div>
                <div class="form-group full">
                  <label class="label">Resume URL</label>
                  <input class="input" [(ngModel)]="basics.resumeUrl" placeholder="Link to your resume PDF" />
                </div>
                <div class="form-group full">
                  <label class="label">
                    Slug
                    <span class="label-hint">your public URL: {{ apiUrl }}/public/portfolio/{{ basics.slug || 'your-slug' }}</span>
                  </label>
                  <input class="input" [(ngModel)]="basics.slug" placeholder="e.g. vnikhil (lowercase, no spaces)" />
                </div>
                <div class="form-group full">
                  <label class="toggle-row">
                    <span class="toggle-label-text">Available for hire</span>
                    <div class="toggle-track" [class.on]="basics.availableForHire" (click)="basics.availableForHire = !basics.availableForHire">
                      <div class="toggle-thumb"></div>
                    </div>
                  </label>
                </div>
                <div class="form-group full">
                  <label class="toggle-row">
                    <span class="toggle-label-text">Published <span class="label-hint">make portfolio visible at your slug URL</span></span>
                    <div class="toggle-track" [class.on]="basics.published" (click)="basics.published = !basics.published">
                      <div class="toggle-thumb"></div>
                    </div>
                  </label>
                </div>
              </div>
              <div class="section-actions">
                <button class="btn-primary" [disabled]="savingBasics" (click)="saveBasics()">
                  {{ savingBasics ? 'Saving...' : 'Save Basics' }}
                </button>
              </div>
            </div>
          }

          <!-- SOCIALS -->
          @if (activeTab() === 'socials' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Social Links</h2>
              <p class="section-desc">Add your social media and portfolio profiles</p>
              <div class="items-list">
                @for (s of portfolio()!.socials; track s.id) {
                  <div class="item-card">
                    <div class="item-card-body">
                      <div class="platform-badge">{{ getPlatformIcon(s.platform) }}</div>
                      <div class="item-info">
                        <span class="item-title">{{ getPlatformLabel(s.platform) }}</span>
                        <a class="item-url" [href]="s.url" target="_blank">{{ s.url }}</a>
                        @if (s.handle) { <span class="item-meta">{{ s.handle }}</span> }
                      </div>
                    </div>
                    <button class="btn-icon danger" (click)="removeSocial(s.id)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                }
              </div>
              <div class="add-form">
                <h3 class="add-form-title">Add social link</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Platform</label>
                    <select class="input" [(ngModel)]="newSocial.platform">
                      @for (p of socialPlatforms; track p.value) {
                        <option [value]="p.value">{{ p.label }}</option>
                      }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="label">Handle (optional)</label>
                    <input class="input" [(ngModel)]="newSocial.handle" placeholder="@username" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="label">URL</label>
                  <input class="input" [(ngModel)]="newSocial.url" placeholder="https://..." />
                </div>
                <button class="btn-primary" (click)="addSocial()">Add Social Link</button>
              </div>
            </div>
          }

          <!-- SKILLS -->
          @if (activeTab() === 'skills' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Skills</h2>
              <p class="section-desc">Showcase your technical and soft skills</p>
              @for (cat of getSkillCategories(); track cat) {
                <div class="skill-group">
                  <h3 class="skill-group-title">{{ cat }}</h3>
                  <div class="skill-chips">
                    @for (skill of getSkillsByCategory(cat); track skill.id) {
                      <div class="skill-chip">
                        <span>{{ skill.name }}</span>
                        @if (skill.level) { <span class="level-badge level-{{ skill.level }}">{{ skill.level }}</span> }
                        <button class="chip-remove" (click)="removeSkill(skill.id)">
                          <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    }
                  </div>
                </div>
              }
              @if (portfolio()!.skills.length === 0) {
                <p class="empty-hint">No skills added yet. Use the form below to add some.</p>
              }
              <div class="add-form">
                <h3 class="add-form-title">Add skill</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Skill name</label>
                    <input class="input" [(ngModel)]="newSkill.name" placeholder="e.g. Angular" />
                  </div>
                  <div class="form-group">
                    <label class="label">Category</label>
                    <select class="input" [(ngModel)]="newSkill.category">
                      <option value="">— Select —</option>
                      @for (c of skillCategories; track c) { <option [value]="c">{{ c }}</option> }
                    </select>
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Level</label>
                    <select class="input" [(ngModel)]="newSkill.level">
                      <option value="">— Select —</option>
                      @for (l of skillLevels; track l.value) { <option [value]="l.value">{{ l.label }}</option> }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="label">Years of experience</label>
                    <input class="input" type="number" min="0" [(ngModel)]="newSkill.yearsOfExperience" placeholder="0" />
                  </div>
                </div>
                <label class="check-row">
                  <input type="checkbox" [(ngModel)]="newSkill.featured" />
                  <span>Featured skill</span>
                </label>
                <button class="btn-primary" (click)="addSkill()">Add Skill</button>
              </div>
            </div>
          }

          <!-- EXPERIENCE -->
          @if (activeTab() === 'experience' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Work Experience</h2>
              <p class="section-desc">Your professional work history</p>
              <div class="timeline">
                @for (exp of portfolio()!.experience; track exp.id) {
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <div>
                          <h3 class="timeline-title">{{ exp.role }}</h3>
                          <p class="timeline-subtitle">
                            {{ exp.company }}
                            @if (exp.type) { <span class="type-badge">{{ getExpTypeLabel(exp.type) }}</span> }
                            @if (exp.current) { <span class="current-badge">Current</span> }
                          </p>
                          <p class="timeline-dates">{{ exp.startDate ?? '' }} {{ exp.endDate ? '→ ' + exp.endDate : exp.current ? '→ Present' : '' }}</p>
                          @if (exp.location) { <p class="timeline-meta">{{ exp.location }}{{ exp.remote ? ' (Remote)' : '' }}</p> }
                        </div>
                        <button class="btn-icon danger" (click)="removeExperience(exp.id)">
                          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      @if (exp.description) { <p class="timeline-desc">{{ exp.description }}</p> }
                      @if (exp.tech && exp.tech.length > 0) {
                        <div class="tech-tags">@for (t of exp.tech; track t) { <span class="tech-tag">{{ t }}</span> }</div>
                      }
                    </div>
                  </div>
                }
                @if (portfolio()!.experience.length === 0) {
                  <p class="empty-hint">No experience added yet.</p>
                }
              </div>
              <div class="add-form">
                <h3 class="add-form-title">Add experience</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Company</label>
                    <input class="input" [(ngModel)]="newExp.company" placeholder="Company name" />
                  </div>
                  <div class="form-group">
                    <label class="label">Role</label>
                    <input class="input" [(ngModel)]="newExp.role" placeholder="Job title" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Type</label>
                    <select class="input" [(ngModel)]="newExp.type">
                      <option value="">— Select —</option>
                      @for (t of expTypes; track t.value) { <option [value]="t.value">{{ t.label }}</option> }
                    </select>
                  </div>
                  <div class="form-group">
                    <label class="label">Location</label>
                    <input class="input" [(ngModel)]="newExp.location" placeholder="City, Country" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Start date</label>
                    <input class="input" [(ngModel)]="newExp.startDate" placeholder="YYYY-MM" />
                  </div>
                  <div class="form-group">
                    <label class="label">End date</label>
                    <input class="input" [(ngModel)]="newExp.endDate" placeholder="YYYY-MM or leave blank if current" />
                  </div>
                </div>
                <div class="form-row">
                  <label class="check-row">
                    <input type="checkbox" [(ngModel)]="newExp.current" />
                    <span>Currently working here</span>
                  </label>
                  <label class="check-row">
                    <input type="checkbox" [(ngModel)]="newExp.remote" />
                    <span>Remote</span>
                  </label>
                </div>
                <div class="form-group">
                  <label class="label">Description</label>
                  <textarea class="input" [(ngModel)]="newExp.description" rows="3" placeholder="What did you do here?"></textarea>
                </div>
                <div class="form-group">
                  <label class="label">Tech stack (comma-separated)</label>
                  <input class="input" [(ngModel)]="newExpTech" placeholder="Angular, NestJS, Firebase..." />
                </div>
                <div class="form-group">
                  <label class="label">Achievements (one per line)</label>
                  <textarea class="input" [(ngModel)]="newExpAchievements" rows="3" placeholder="Built X which resulted in Y..."></textarea>
                </div>
                <button class="btn-primary" (click)="addExperience()">Add Experience</button>
              </div>
            </div>
          }

          <!-- EDUCATION -->
          @if (activeTab() === 'education' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Education</h2>
              <p class="section-desc">Your academic background</p>
              <div class="timeline">
                @for (edu of portfolio()!.education; track edu.id) {
                  <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <div>
                          <h3 class="timeline-title">{{ edu.institution }}</h3>
                          <p class="timeline-subtitle">{{ edu.degree ?? '' }}{{ edu.field ? ' in ' + edu.field : '' }}</p>
                          <p class="timeline-dates">{{ edu.startDate ?? '' }} {{ edu.endDate ? '→ ' + edu.endDate : '' }}</p>
                          @if (edu.grade) { <p class="timeline-meta">Grade: {{ edu.grade }}</p> }
                        </div>
                        <button class="btn-icon danger" (click)="removeEducation(edu.id)">
                          <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                      @if (edu.description) { <p class="timeline-desc">{{ edu.description }}</p> }
                    </div>
                  </div>
                }
                @if (portfolio()!.education.length === 0) {
                  <p class="empty-hint">No education added yet.</p>
                }
              </div>
              <div class="add-form">
                <h3 class="add-form-title">Add education</h3>
                <div class="form-group">
                  <label class="label">Institution *</label>
                  <input class="input" [(ngModel)]="newEdu.institution" placeholder="University / School name" />
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Degree</label>
                    <input class="input" [(ngModel)]="newEdu.degree" placeholder="e.g. B.Tech, M.Sc" />
                  </div>
                  <div class="form-group">
                    <label class="label">Field of study</label>
                    <input class="input" [(ngModel)]="newEdu.field" placeholder="e.g. Computer Science" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Start date</label>
                    <input class="input" [(ngModel)]="newEdu.startDate" placeholder="YYYY-MM" />
                  </div>
                  <div class="form-group">
                    <label class="label">End date</label>
                    <input class="input" [(ngModel)]="newEdu.endDate" placeholder="YYYY-MM" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Grade / GPA</label>
                    <input class="input" [(ngModel)]="newEdu.grade" placeholder="e.g. 8.5 CGPA" />
                  </div>
                  <div class="form-group">
                    <label class="label">Institution URL</label>
                    <input class="input" [(ngModel)]="newEdu.institutionUrl" placeholder="https://..." />
                  </div>
                </div>
                <div class="form-group">
                  <label class="label">Description</label>
                  <textarea class="input" [(ngModel)]="newEdu.description" rows="2" placeholder="Notable coursework, activities..."></textarea>
                </div>
                <button class="btn-primary" (click)="addEducation()">Add Education</button>
              </div>
            </div>
          }

          <!-- CERTIFICATIONS -->
          @if (activeTab() === 'certifications' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Certifications</h2>
              <p class="section-desc">Professional certifications and licenses</p>
              <div class="cards-grid">
                @for (cert of portfolio()!.certifications; track cert.id) {
                  <div class="cert-card">
                    <div class="cert-body">
                      <h3 class="cert-name">{{ cert.name }}</h3>
                      <p class="cert-issuer">{{ cert.issuer }}</p>
                      @if (cert.issuedDate) { <p class="cert-date">Issued: {{ cert.issuedDate }}</p> }
                      @if (cert.expiryDate) { <p class="cert-date">Expires: {{ cert.expiryDate }}</p> }
                      @if (cert.credentialId) { <p class="cert-meta">ID: {{ cert.credentialId }}</p> }
                      @if (cert.credentialUrl) { <a class="cert-link" [href]="cert.credentialUrl" target="_blank">View credential</a> }
                    </div>
                    <button class="btn-icon danger" (click)="removeCertification(cert.id)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                }
                @if (portfolio()!.certifications.length === 0) {
                  <p class="empty-hint">No certifications added yet.</p>
                }
              </div>
              <div class="add-form">
                <h3 class="add-form-title">Add certification</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Name *</label>
                    <input class="input" [(ngModel)]="newCert.name" placeholder="Certification name" />
                  </div>
                  <div class="form-group">
                    <label class="label">Issuer *</label>
                    <input class="input" [(ngModel)]="newCert.issuer" placeholder="e.g. Google, AWS, Coursera" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Issue date</label>
                    <input class="input" [(ngModel)]="newCert.issuedDate" placeholder="YYYY-MM" />
                  </div>
                  <div class="form-group">
                    <label class="label">Expiry date</label>
                    <input class="input" [(ngModel)]="newCert.expiryDate" placeholder="YYYY-MM (optional)" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Credential ID</label>
                    <input class="input" [(ngModel)]="newCert.credentialId" placeholder="Certificate ID" />
                  </div>
                  <div class="form-group">
                    <label class="label">Credential URL</label>
                    <input class="input" [(ngModel)]="newCert.credentialUrl" placeholder="https://..." />
                  </div>
                </div>
                <button class="btn-primary" (click)="addCertification()">Add Certification</button>
              </div>
            </div>
          }

          <!-- ACHIEVEMENTS -->
          @if (activeTab() === 'achievements' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Achievements</h2>
              <p class="section-desc">Awards, recognitions, and notable accomplishments</p>
              <div class="items-list">
                @for (ach of portfolio()!.achievements; track ach.id) {
                  <div class="item-card">
                    <div class="item-card-body">
                      <div class="item-info">
                        <span class="item-title">{{ ach.title }}</span>
                        @if (ach.category) { <span class="category-badge">{{ ach.category }}</span> }
                        @if (ach.date) { <span class="item-meta">{{ ach.date }}</span> }
                        @if (ach.description) { <p class="item-desc">{{ ach.description }}</p> }
                        @if (ach.url) { <a class="cert-link" [href]="ach.url" target="_blank">Learn more</a> }
                      </div>
                    </div>
                    <button class="btn-icon danger" (click)="removeAchievement(ach.id)">
                      <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                }
                @if (portfolio()!.achievements.length === 0) {
                  <p class="empty-hint">No achievements added yet.</p>
                }
              </div>
              <div class="add-form">
                <h3 class="add-form-title">Add achievement</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Title *</label>
                    <input class="input" [(ngModel)]="newAch.title" placeholder="Achievement title" />
                  </div>
                  <div class="form-group">
                    <label class="label">Category</label>
                    <input class="input" [(ngModel)]="newAch.category" placeholder="e.g. Hackathon, Open Source" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="label">Date</label>
                    <input class="input" [(ngModel)]="newAch.date" placeholder="YYYY-MM" />
                  </div>
                  <div class="form-group">
                    <label class="label">URL</label>
                    <input class="input" [(ngModel)]="newAch.url" placeholder="https://..." />
                  </div>
                </div>
                <div class="form-group">
                  <label class="label">Description</label>
                  <textarea class="input" [(ngModel)]="newAch.description" rows="2" placeholder="Describe this achievement..."></textarea>
                </div>
                <button class="btn-primary" (click)="addAchievement()">Add Achievement</button>
              </div>
            </div>
          }

          <!-- INTERESTS -->
          @if (activeTab() === 'interests' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Interests</h2>
              <p class="section-desc">Your hobbies and personal interests</p>
              <div class="interests-chips">
                @for (interest of interests; track $index) {
                  <span class="interest-chip">
                    {{ interest }}
                    <button class="chip-remove" (click)="removeInterest($index)">
                      <svg width="10" height="10" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </span>
                }
                @if (interests.length === 0) { <span class="empty-hint">No interests added yet.</span> }
              </div>
              <div class="add-form">
                <div class="form-group">
                  <label class="label">Add interest (press Enter or comma to add)</label>
                  <input class="input" [(ngModel)]="newInterestInput" (keydown)="onInterestKey($event)" placeholder="e.g. Photography, Gaming, Hiking..." />
                </div>
                <button class="btn-primary" (click)="addInterest()">Add</button>
              </div>
              <div class="section-actions">
                <button class="btn-primary" [disabled]="savingInterests" (click)="saveInterests()">
                  {{ savingInterests ? 'Saving...' : 'Save Interests' }}
                </button>
              </div>
            </div>
          }

          <!-- SETTINGS -->
          @if (activeTab() === 'settings' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Portfolio Settings</h2>
              <p class="section-desc">Customize the look and sections of your public portfolio</p>
              <div class="form-group">
                <label class="label">Theme</label>
                <div class="theme-cards">
                  <div class="theme-card classic" [class.selected]="settings.theme === 'classic'" (click)="settings.theme = 'classic'">
                    <div class="theme-preview classic-preview"></div>
                    <span class="theme-name">Classic</span>
                    <span class="theme-desc">Dark with green accent</span>
                    @if (settings.theme === 'classic') { <span class="theme-check">✓</span> }
                  </div>
                  <div class="theme-card minimal" [class.selected]="settings.theme === 'minimal'" (click)="settings.theme = 'minimal'">
                    <div class="theme-preview minimal-preview"></div>
                    <span class="theme-name">Minimal</span>
                    <span class="theme-desc">Clean and light</span>
                    @if (settings.theme === 'minimal') { <span class="theme-check">✓</span> }
                  </div>
                  <div class="theme-card developer" [class.selected]="settings.theme === 'developer'" (click)="settings.theme = 'developer'">
                    <div class="theme-preview developer-preview"></div>
                    <span class="theme-name">Developer</span>
                    <span class="theme-desc">Dark blue / code aesthetic</span>
                    @if (settings.theme === 'developer') { <span class="theme-check">✓</span> }
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label class="label">Accent color</label>
                <div class="color-input-row">
                  <input type="color" class="color-picker" [(ngModel)]="settings.accentColor" />
                  <input class="input color-text" [(ngModel)]="settings.accentColor" placeholder="#10b981" />
                </div>
              </div>
              <div class="form-group">
                <label class="label">Visible sections</label>
                <div class="section-toggles">
                  @for (key of sectionKeys; track key) {
                    <label class="toggle-row compact">
                      <span class="toggle-label-text">{{ sectionLabel(key) }}</span>
                      <div class="toggle-track" [class.on]="settings.showSections[key]" (click)="settings.showSections[key] = !settings.showSections[key]">
                        <div class="toggle-thumb"></div>
                      </div>
                    </label>
                  }
                </div>
              </div>
              <div class="section-actions">
                <button class="btn-primary" [disabled]="savingSettings" (click)="saveSettings()">
                  {{ savingSettings ? 'Saving...' : 'Save Settings' }}
                </button>
              </div>
            </div>
          }

          <!-- PREVIEW -->
          @if (activeTab() === 'preview' && portfolio()) {
            <div class="section">
              <h2 class="section-title">Preview & Publish</h2>
              <p class="section-desc">Share your public portfolio with the world</p>
              <div class="preview-card">
                <div class="preview-row">
                  <span class="preview-label">Public site URL</span>
                  <a class="preview-link" href="https://your-portfolio-site.vercel.app" target="_blank">
                    https://your-portfolio-site.vercel.app
                  </a>
                </div>
                <div class="preview-row">
                  <span class="preview-label">API endpoint</span>
                  <div class="preview-api-row">
                    <code class="preview-code">{{ apiUrl }}/public/portfolio/{{ portfolio()!.basics?.slug || 'your-slug' }}</code>
                    <button class="btn-ghost sm" (click)="copyApiUrl()">Copy</button>
                  </div>
                </div>
              </div>
              <div class="stats-grid">
                <div class="stat-card">
                  <span class="stat-num">{{ portfolio()!.skills.length }}</span>
                  <span class="stat-label">Skills</span>
                </div>
                <div class="stat-card">
                  <span class="stat-num">{{ portfolio()!.experience.length }}</span>
                  <span class="stat-label">Experience</span>
                </div>
                <div class="stat-card">
                  <span class="stat-num">{{ portfolio()!.education.length }}</span>
                  <span class="stat-label">Education</span>
                </div>
                <div class="stat-card">
                  <span class="stat-num">{{ portfolio()!.certifications.length }}</span>
                  <span class="stat-label">Certifications</span>
                </div>
                <div class="stat-card">
                  <span class="stat-num">{{ portfolio()!.achievements.length }}</span>
                  <span class="stat-label">Achievements</span>
                </div>
                <div class="stat-card">
                  <span class="stat-num">{{ portfolio()!.socials.length }}</span>
                  <span class="stat-label">Socials</span>
                </div>
              </div>
              <div class="preview-status">
                @if (portfolio()!.basics?.published) {
                  <div class="status-ok">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    Portfolio is published and publicly accessible
                  </div>
                } @else {
                  <div class="status-draft">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Portfolio is in draft mode. Set a slug and toggle Published in Basics to go live.
                  </div>
                }
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .portfolio-page { padding: 1.5rem 2rem; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
    .page-title { font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .page-subtitle { color: var(--text-muted); font-size: 0.875rem; margin: 0.25rem 0 0; }
    .published-badge { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .draft-badge { background: rgba(234,179,8,0.12); color: #eab308; border: 1px solid rgba(234,179,8,0.25); padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .portfolio-layout { display: grid; grid-template-columns: 200px 1fr; gap: 1.5rem; align-items: start; }
    /* Tab nav */
    .tab-nav { display: flex; flex-direction: column; gap: 2px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 0.5rem; position: sticky; top: 1rem; }
    .tab-btn { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 8px; border: none; background: transparent; color: var(--text-secondary); font-size: 0.82rem; font-weight: 500; cursor: pointer; text-align: left; transition: all 0.15s; width: 100%; font-family: inherit; }
    .tab-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
    .tab-btn.active { background: rgba(16,185,129,0.12); color: #10b981; font-weight: 600; }
    .tab-icon { display: flex; width: 16px; height: 16px; flex-shrink: 0; }
    /* Section */
    .tab-content { background: var(--bg-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; min-height: 400px; }
    .section { display: flex; flex-direction: column; gap: 1.25rem; }
    .section-title { font-size: 1.125rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .section-desc { color: var(--text-muted); font-size: 0.82rem; margin: 0; }
    .section-actions { display: flex; justify-content: flex-end; padding-top: 0.5rem; }
    .loading-state { color: var(--text-muted); padding: 2rem; text-align: center; }
    /* Form */
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.875rem; }
    .form-group { display: flex; flex-direction: column; gap: 0.25rem; }
    .form-group.full { grid-column: 1 / -1; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
    .label { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
    .label-hint { font-size: 0.7rem; font-weight: 400; color: var(--text-muted); margin-left: 6px; }
    textarea.input { resize: vertical; }
    /* Toggle */
    .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 0.625rem 0; }
    .toggle-row.compact { padding: 0.375rem 0; }
    .toggle-label-text { font-size: 0.875rem; color: var(--text-primary); }
    .toggle-track { width: 42px; height: 24px; background: var(--border); border-radius: 12px; cursor: pointer; position: relative; transition: background 0.2s; flex-shrink: 0; }
    .toggle-track.on { background: #10b981; }
    .toggle-thumb { width: 18px; height: 18px; background: white; border-radius: 50%; position: absolute; top: 3px; left: 3px; transition: transform 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.2); }
    .toggle-track.on .toggle-thumb { transform: translateX(18px); }
    /* Items list */
    .items-list { display: flex; flex-direction: column; gap: 0.5rem; }
    .item-card { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 10px; padding: 0.875rem; }
    .item-card-body { display: flex; align-items: flex-start; gap: 0.75rem; flex: 1; min-width: 0; }
    .platform-badge { width: 36px; height: 36px; border-radius: 8px; background: rgba(16,185,129,0.12); color: #10b981; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; flex-shrink: 0; }
    .item-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .item-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
    .item-url { font-size: 0.78rem; color: #10b981; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .item-url:hover { text-decoration: underline; }
    .item-meta { font-size: 0.72rem; color: var(--text-muted); }
    .item-desc { font-size: 0.78rem; color: var(--text-secondary); margin: 4px 0 0; }
    .category-badge { font-size: 0.68rem; font-weight: 600; color: var(--text-muted); background: var(--bg-secondary); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border); }
    /* Add form */
    .add-form { background: var(--bg-hover); border: 1px dashed var(--border); border-radius: 10px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
    .add-form-title { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); margin: 0; }
    /* Skills */
    .skill-group { margin-bottom: 1rem; }
    .skill-group-title { font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.5rem; }
    .skill-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .skill-chip { display: flex; align-items: center; gap: 6px; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 20px; padding: 4px 10px; font-size: 0.82rem; color: var(--text-primary); }
    .level-badge { font-size: 0.62rem; font-weight: 700; padding: 1px 5px; border-radius: 4px; text-transform: capitalize; }
    .level-beginner { background: rgba(148,163,184,0.15); color: #94a3b8; }
    .level-intermediate { background: rgba(234,179,8,0.12); color: #eab308; }
    .level-advanced { background: rgba(59,130,246,0.12); color: #3b82f6; }
    .level-expert { background: rgba(16,185,129,0.12); color: #10b981; }
    .chip-remove { background: none; border: none; cursor: pointer; color: var(--text-muted); display: flex; padding: 0; line-height: 1; }
    .chip-remove:hover { color: #ef4444; }
    /* Timeline */
    .timeline { display: flex; flex-direction: column; gap: 0; padding-left: 1.25rem; border-left: 2px solid var(--border); }
    .timeline-item { position: relative; padding: 0 0 1.25rem 1.25rem; }
    .timeline-dot { position: absolute; left: -1.5rem; top: 0.25rem; width: 10px; height: 10px; border-radius: 50%; background: #10b981; border: 2px solid var(--bg-secondary); }
    .timeline-content { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 10px; padding: 0.875rem; }
    .timeline-header { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; }
    .timeline-title { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .timeline-subtitle { font-size: 0.82rem; color: var(--text-secondary); margin: 2px 0; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .timeline-dates { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0; }
    .timeline-meta { font-size: 0.75rem; color: var(--text-muted); margin: 2px 0; }
    .timeline-desc { font-size: 0.82rem; color: var(--text-secondary); margin: 8px 0 0; line-height: 1.6; }
    .type-badge { font-size: 0.65rem; font-weight: 700; background: rgba(59,130,246,0.12); color: #3b82f6; padding: 2px 6px; border-radius: 4px; text-transform: capitalize; }
    .current-badge { font-size: 0.65rem; font-weight: 700; background: rgba(16,185,129,0.12); color: #10b981; padding: 2px 6px; border-radius: 4px; }
    .tech-tags { display: flex; flex-wrap: wrap; gap: 0.375rem; margin-top: 0.5rem; }
    .tech-tag { font-size: 0.7rem; background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border); padding: 2px 7px; border-radius: 4px; }
    /* Certs */
    .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem; }
    .cert-card { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 10px; padding: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; position: relative; }
    .cert-body { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .cert-name { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); margin: 0; }
    .cert-issuer { font-size: 0.78rem; color: var(--text-secondary); margin: 0; }
    .cert-date { font-size: 0.72rem; color: var(--text-muted); margin: 0; }
    .cert-meta { font-size: 0.7rem; color: var(--text-muted); margin: 0; }
    .cert-link { font-size: 0.75rem; color: #10b981; text-decoration: none; margin-top: 4px; display: inline-block; }
    .cert-link:hover { text-decoration: underline; }
    .cert-card .btn-icon { position: absolute; top: 8px; right: 8px; }
    /* Interests */
    .interests-chips { display: flex; flex-wrap: wrap; gap: 0.5rem; min-height: 40px; }
    .interest-chip { display: flex; align-items: center; gap: 6px; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; border-radius: 20px; padding: 4px 12px; font-size: 0.82rem; font-weight: 500; }
    /* Settings */
    .theme-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .theme-card { border: 2px solid var(--border); border-radius: 12px; padding: 0.875rem; cursor: pointer; transition: all 0.15s; position: relative; display: flex; flex-direction: column; gap: 4px; }
    .theme-card:hover { border-color: var(--text-muted); }
    .theme-card.selected { border-color: #10b981; }
    .theme-preview { height: 50px; border-radius: 6px; margin-bottom: 4px; }
    .classic-preview { background: linear-gradient(135deg, #0d1117 60%, #10b981 100%); }
    .minimal-preview { background: linear-gradient(135deg, #f8f9fa 60%, #10b981 100%); border: 1px solid #e9ecef; }
    .developer-preview { background: linear-gradient(135deg, #0f0f1a 60%, #818cf8 100%); }
    .theme-name { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
    .theme-desc { font-size: 0.72rem; color: var(--text-muted); }
    .theme-check { position: absolute; top: 8px; right: 8px; color: #10b981; font-size: 0.875rem; }
    .color-input-row { display: flex; align-items: center; gap: 0.75rem; }
    .color-picker { width: 48px; height: 36px; border-radius: 8px; border: 1px solid var(--border); padding: 2px; cursor: pointer; background: var(--bg-hover); }
    .color-text { flex: 1; }
    .section-toggles { display: flex; flex-direction: column; gap: 0.25rem; background: var(--bg-hover); border: 1px solid var(--border); border-radius: 10px; padding: 0.625rem 0.875rem; }
    /* Preview */
    .preview-card { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 1rem; }
    .preview-row { display: flex; flex-direction: column; gap: 4px; }
    .preview-label { font-size: 0.72rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
    .preview-link { font-size: 0.875rem; color: #10b981; text-decoration: none; }
    .preview-link:hover { text-decoration: underline; }
    .preview-api-row { display: flex; align-items: center; gap: 0.75rem; }
    .preview-code { font-family: monospace; font-size: 0.78rem; color: var(--text-secondary); background: var(--bg-secondary); padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .stat-card { background: var(--bg-hover); border: 1px solid var(--border); border-radius: 10px; padding: 1rem; text-align: center; display: flex; flex-direction: column; gap: 4px; }
    .stat-num { font-size: 1.75rem; font-weight: 800; color: #10b981; }
    .stat-label { font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .preview-status { border-radius: 10px; padding: 0.875rem 1rem; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
    .status-ok { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.25); color: #10b981; border-radius: 10px; padding: 0.875rem 1rem; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
    .status-draft { background: rgba(234,179,8,0.08); border: 1px solid rgba(234,179,8,0.2); color: #eab308; border-radius: 10px; padding: 0.875rem 1rem; display: flex; align-items: center; gap: 8px; font-size: 0.82rem; }
    /* Shared */
    .btn-icon { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; display: flex; flex-shrink: 0; transition: all 0.15s; }
    .btn-icon.danger:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
    .check-row { display: flex; align-items: center; gap: 8px; font-size: 0.82rem; color: var(--text-secondary); cursor: pointer; }
    .check-row input { cursor: pointer; }
    .empty-hint { color: var(--text-muted); font-size: 0.82rem; font-style: italic; }
    @media (max-width: 768px) {
      .portfolio-layout { grid-template-columns: 1fr; }
      .tab-nav { flex-direction: row; overflow-x: auto; position: static; }
      .form-grid { grid-template-columns: 1fr; }
      .form-group.full { grid-column: auto; }
      .form-row { grid-template-columns: 1fr; }
      .theme-cards { grid-template-columns: 1fr; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `],
})
export class PortfolioPageComponent implements OnInit, OnDestroy {
  private portfolioSvc = inject(PortfolioService);
  private toast = inject(ToastService);

  portfolio = signal<MyPortfolio | null>(null);
  activeTab = signal('basics');
  loading = true;
  apiUrl = environment.apiUrl;

  savingBasics = false;
  savingSettings = false;
  savingInterests = false;

  // Local draft for basics
  basics: PortfolioBasics = {};

  // Local draft for settings
  settings: PortfolioSettings = {
    theme: 'classic',
    accentColor: '#10b981',
    showSections: { skills: true, education: true, experience: true, certifications: true, achievements: true, interests: true, projects: true },
  };

  // Interests
  interests: string[] = [];
  newInterestInput = '';

  // New item forms
  newSocial: any = { platform: 'github', url: '', handle: '' };
  newSkill: any = { name: '', category: '', level: '', yearsOfExperience: 0, featured: false };
  newExp: any = { company: '', role: '', type: '', startDate: '', endDate: '', current: false, location: '', remote: false, description: '' };
  newExpTech = '';
  newExpAchievements = '';
  newEdu: any = { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '', description: '', institutionUrl: '' };
  newCert: any = { name: '', issuer: '', issuedDate: '', expiryDate: '', credentialId: '', credentialUrl: '' };
  newAch: any = { title: '', category: '', date: '', url: '', description: '' };

  skillCategories = SKILL_CATEGORIES;
  skillLevels = SKILL_LEVELS;
  expTypes = EXPERIENCE_TYPES;
  socialPlatforms = SOCIAL_PLATFORMS;
  sectionKeys: (keyof PortfolioSettings['showSections'])[] = ['skills', 'education', 'experience', 'certifications', 'achievements', 'interests', 'projects'];

  tabs = [
    { id: 'basics', label: 'Basics', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/></svg>' },
    { id: 'socials', label: 'Socials', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>' },
    { id: 'skills', label: 'Skills', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>' },
    { id: 'experience', label: 'Experience', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>' },
    { id: 'education', label: 'Education', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>' },
    { id: 'certifications', label: 'Certs', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>' },
    { id: 'achievements', label: 'Achievements', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' },
    { id: 'interests', label: 'Interests', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>' },
    { id: 'settings', label: 'Settings', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>' },
    { id: 'preview', label: 'Preview', icon: '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' },
  ];

  private sub?: Subscription;

  ngOnInit() {
    this.sub = this.portfolioSvc.portfolio$.subscribe((p) => {
      this.portfolio.set(p);
      if (p) {
        this.basics = { ...p.basics };
        this.settings = {
          theme: p.settings?.theme ?? 'classic',
          accentColor: p.settings?.accentColor ?? '#10b981',
          showSections: { ...(p.settings?.showSections ?? { skills: true, education: true, experience: true, certifications: true, achievements: true, interests: true, projects: true }) },
        };
        this.interests = [...(p.interests ?? [])];
      }
    });
    this.portfolioSvc.load().subscribe({ next: () => { this.loading = false; }, error: () => { this.loading = false; } });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  // ---- Helpers ----
  getPlatformIcon(platform: string): string {
    return SOCIAL_PLATFORMS.find((p) => p.value === platform)?.icon ?? '?';
  }
  getPlatformLabel(platform: string): string {
    return SOCIAL_PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
  }
  getExpTypeLabel(type: string): string {
    return EXPERIENCE_TYPES.find((t) => t.value === type)?.label ?? type;
  }
  getSkillCategories(): string[] {
    const cats = new Set(this.portfolio()?.skills.map((s) => s.category ?? 'Other') ?? []);
    return Array.from(cats);
  }
  getSkillsByCategory(cat: string): PortfolioSkill[] {
    return this.portfolio()?.skills.filter((s) => (s.category ?? 'Other') === cat) ?? [];
  }
  sectionLabel(key: string): string {
    const labels: Record<string, string> = { skills: 'Skills', education: 'Education', experience: 'Experience', certifications: 'Certifications', achievements: 'Achievements', interests: 'Interests', projects: 'Projects' };
    return labels[key] ?? key;
  }

  // ---- Basics ----
  saveBasics() {
    this.savingBasics = true;
    this.portfolioSvc.upsertBasics(this.basics).subscribe({
      next: () => { this.savingBasics = false; this.toast.success('Basics saved'); },
      error: () => { this.savingBasics = false; this.toast.error('Failed to save basics'); },
    });
  }

  // ---- Settings ----
  saveSettings() {
    this.savingSettings = true;
    this.portfolioSvc.upsertSettings(this.settings).subscribe({
      next: () => { this.savingSettings = false; this.toast.success('Settings saved'); },
      error: () => { this.savingSettings = false; this.toast.error('Failed to save settings'); },
    });
  }

  // ---- Interests ----
  onInterestKey(ev: KeyboardEvent) {
    if (ev.key === 'Enter' || ev.key === ',') { ev.preventDefault(); this.addInterest(); }
  }
  addInterest() {
    const vals = this.newInterestInput.split(',').map((v) => v.trim()).filter(Boolean);
    this.interests = [...this.interests, ...vals.filter((v) => !this.interests.includes(v))];
    this.newInterestInput = '';
  }
  removeInterest(i: number) { this.interests = this.interests.filter((_, idx) => idx !== i); }
  saveInterests() {
    this.savingInterests = true;
    this.portfolioSvc.upsertInterests(this.interests).subscribe({
      next: () => { this.savingInterests = false; this.toast.success('Interests saved'); },
      error: () => { this.savingInterests = false; this.toast.error('Failed to save interests'); },
    });
  }

  // ---- Socials ----
  addSocial() {
    if (!this.newSocial.url) { this.toast.warning('URL is required'); return; }
    this.portfolioSvc.addItem('socials', { platform: this.newSocial.platform, url: this.newSocial.url, handle: this.newSocial.handle || undefined }).subscribe({
      next: () => { this.toast.success('Social added'); this.newSocial = { platform: 'github', url: '', handle: '' }; },
      error: () => this.toast.error('Failed to add social'),
    });
  }
  removeSocial(id: string) {
    this.portfolioSvc.removeItem('socials', id).subscribe({ next: () => this.toast.success('Social removed'), error: () => this.toast.error('Failed to remove') });
  }

  // ---- Skills ----
  addSkill() {
    if (!this.newSkill.name) { this.toast.warning('Skill name is required'); return; }
    const dto: any = { name: this.newSkill.name };
    if (this.newSkill.category) dto.category = this.newSkill.category;
    if (this.newSkill.level) dto.level = this.newSkill.level;
    if (this.newSkill.yearsOfExperience) dto.yearsOfExperience = this.newSkill.yearsOfExperience;
    dto.featured = this.newSkill.featured;
    this.portfolioSvc.addItem('skills', dto).subscribe({
      next: () => { this.toast.success('Skill added'); this.newSkill = { name: '', category: '', level: '', yearsOfExperience: 0, featured: false }; },
      error: () => this.toast.error('Failed to add skill'),
    });
  }
  removeSkill(id: string) {
    this.portfolioSvc.removeItem('skills', id).subscribe({ next: () => this.toast.success('Skill removed'), error: () => this.toast.error('Failed to remove') });
  }

  // ---- Experience ----
  addExperience() {
    if (!this.newExp.company || !this.newExp.role) { this.toast.warning('Company and role are required'); return; }
    const dto: any = { company: this.newExp.company, role: this.newExp.role };
    if (this.newExp.type) dto.type = this.newExp.type;
    if (this.newExp.startDate) dto.startDate = this.newExp.startDate;
    if (this.newExp.endDate) dto.endDate = this.newExp.endDate;
    dto.current = this.newExp.current;
    if (this.newExp.location) dto.location = this.newExp.location;
    dto.remote = this.newExp.remote;
    if (this.newExp.description) dto.description = this.newExp.description;
    if (this.newExpTech) dto.tech = this.newExpTech.split(',').map((t: string) => t.trim()).filter(Boolean);
    if (this.newExpAchievements) dto.achievements = this.newExpAchievements.split('\n').map((a: string) => a.trim()).filter(Boolean);
    this.portfolioSvc.addItem('experience', dto).subscribe({
      next: () => { this.toast.success('Experience added'); this.newExp = { company: '', role: '', type: '', startDate: '', endDate: '', current: false, location: '', remote: false, description: '' }; this.newExpTech = ''; this.newExpAchievements = ''; },
      error: () => this.toast.error('Failed to add experience'),
    });
  }
  removeExperience(id: string) {
    this.portfolioSvc.removeItem('experience', id).subscribe({ next: () => this.toast.success('Experience removed'), error: () => this.toast.error('Failed to remove') });
  }

  // ---- Education ----
  addEducation() {
    if (!this.newEdu.institution) { this.toast.warning('Institution is required'); return; }
    const dto: any = { institution: this.newEdu.institution };
    if (this.newEdu.degree) dto.degree = this.newEdu.degree;
    if (this.newEdu.field) dto.field = this.newEdu.field;
    if (this.newEdu.startDate) dto.startDate = this.newEdu.startDate;
    if (this.newEdu.endDate) dto.endDate = this.newEdu.endDate;
    if (this.newEdu.grade) dto.grade = this.newEdu.grade;
    if (this.newEdu.description) dto.description = this.newEdu.description;
    if (this.newEdu.institutionUrl) dto.institutionUrl = this.newEdu.institutionUrl;
    this.portfolioSvc.addItem('education', dto).subscribe({
      next: () => { this.toast.success('Education added'); this.newEdu = { institution: '', degree: '', field: '', startDate: '', endDate: '', grade: '', description: '', institutionUrl: '' }; },
      error: () => this.toast.error('Failed to add education'),
    });
  }
  removeEducation(id: string) {
    this.portfolioSvc.removeItem('education', id).subscribe({ next: () => this.toast.success('Education removed'), error: () => this.toast.error('Failed to remove') });
  }

  // ---- Certifications ----
  addCertification() {
    if (!this.newCert.name || !this.newCert.issuer) { this.toast.warning('Name and issuer are required'); return; }
    const dto: any = { name: this.newCert.name, issuer: this.newCert.issuer };
    if (this.newCert.issuedDate) dto.issuedDate = this.newCert.issuedDate;
    if (this.newCert.expiryDate) dto.expiryDate = this.newCert.expiryDate;
    if (this.newCert.credentialId) dto.credentialId = this.newCert.credentialId;
    if (this.newCert.credentialUrl) dto.credentialUrl = this.newCert.credentialUrl;
    this.portfolioSvc.addItem('certifications', dto).subscribe({
      next: () => { this.toast.success('Certification added'); this.newCert = { name: '', issuer: '', issuedDate: '', expiryDate: '', credentialId: '', credentialUrl: '' }; },
      error: () => this.toast.error('Failed to add certification'),
    });
  }
  removeCertification(id: string) {
    this.portfolioSvc.removeItem('certifications', id).subscribe({ next: () => this.toast.success('Certification removed'), error: () => this.toast.error('Failed to remove') });
  }

  // ---- Achievements ----
  addAchievement() {
    if (!this.newAch.title) { this.toast.warning('Title is required'); return; }
    const dto: any = { title: this.newAch.title };
    if (this.newAch.category) dto.category = this.newAch.category;
    if (this.newAch.date) dto.date = this.newAch.date;
    if (this.newAch.url) dto.url = this.newAch.url;
    if (this.newAch.description) dto.description = this.newAch.description;
    this.portfolioSvc.addItem('achievements', dto).subscribe({
      next: () => { this.toast.success('Achievement added'); this.newAch = { title: '', category: '', date: '', url: '', description: '' }; },
      error: () => this.toast.error('Failed to add achievement'),
    });
  }
  removeAchievement(id: string) {
    this.portfolioSvc.removeItem('achievements', id).subscribe({ next: () => this.toast.success('Achievement removed'), error: () => this.toast.error('Failed to remove') });
  }

  // ---- Preview ----
  copyApiUrl() {
    const url = `${this.apiUrl}/public/portfolio/${this.portfolio()?.basics?.slug ?? ''}`;
    navigator.clipboard.writeText(url).then(() => this.toast.success('Copied to clipboard'));
  }
}
