// Portfolio site app.js
// Fetches data from the NestJS API and renders the portfolio

const THEMES = ['classic', 'minimal', 'developer'];
let currentThemeIndex = 0;
let portfolioData = null;

function setTheme(theme) {
  const link = document.getElementById('theme-css');
  link.href = `themes/${theme}.css`;
  const idx = THEMES.indexOf(theme);
  currentThemeIndex = idx >= 0 ? idx : 0;
  // Apply accent color as CSS variable
  if (portfolioData && portfolioData.settings && portfolioData.settings.accentColor) {
    document.documentElement.style.setProperty('--accent', portfolioData.settings.accentColor);
  }
}

function cycleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  setTheme(THEMES[currentThemeIndex]);
}

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(d) {
  if (!d) return '';
  // YYYY-MM → Month YYYY
  const parts = d.split('-');
  if (parts.length >= 2) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const m = parseInt(parts[1], 10);
    return `${months[m - 1] || ''} ${parts[0]}`;
  }
  return d;
}

function showSection(id, show) {
  const el = document.getElementById(id);
  if (el) el.style.display = show ? '' : 'none';
}

function renderHero(basics, interests) {
  document.title = basics.name ? `${basics.name} — Portfolio` : 'Portfolio';
  document.getElementById('nav-name').textContent = basics.name || '';
  document.getElementById('hero-name').textContent = basics.name || '';

  const headline = document.getElementById('hero-headline');
  headline.textContent = basics.headline || '';
  headline.hidden = !basics.headline;

  const bio = document.getElementById('hero-bio');
  bio.textContent = basics.bio || '';
  bio.hidden = !basics.bio;

  // Avatar
  if (basics.avatar) {
    document.getElementById('hero-avatar').src = basics.avatar;
    document.getElementById('hero-avatar-wrap').hidden = false;
  }

  // Available badge
  if (basics.availableForHire) {
    document.getElementById('available-badge').hidden = false;
  }

  // Meta: location, email, phone
  const meta = document.getElementById('hero-meta');
  const metaParts = [];
  if (basics.location) metaParts.push(`<span class="meta-item">&#128205; ${esc(basics.location)}</span>`);
  if (basics.email) metaParts.push(`<span class="meta-item"><a href="mailto:${esc(basics.email)}">${esc(basics.email)}</a></span>`);
  if (basics.phone) metaParts.push(`<span class="meta-item">${esc(basics.phone)}</span>`);
  meta.innerHTML = metaParts.join('');

  // Interests
  if (interests && interests.length > 0) {
    const interestsWrap = document.getElementById('hero-interests');
    interestsWrap.hidden = false;
    const chips = document.getElementById('interests-chips');
    chips.innerHTML = interests.map((i) => `<span class="interest-chip">${esc(i)}</span>`).join('');
  }

  // Actions: resume
  const actions = document.getElementById('hero-actions');
  const actionParts = [];
  if (basics.resumeUrl) {
    actionParts.push(`<a href="${esc(basics.resumeUrl)}" target="_blank" class="btn-primary">Download Resume</a>`);
  }
  actionParts.push(`<a href="#contact" class="btn-outline">Contact Me</a>`);
  actions.innerHTML = actionParts.join('');
}

function renderSocials(socials) {
  const container = document.getElementById('hero-socials');
  if (!socials || socials.length === 0) { container.innerHTML = ''; return; }
  const icons = {
    github: 'GH', linkedin: 'in', twitter: 'X', instagram: 'IG',
    youtube: 'YT', dribbble: 'Dr', behance: 'Be', figma: 'Fi', website: 'W', other: '...'
  };
  container.innerHTML = socials.map((s) => `
    <a href="${esc(s.url)}" target="_blank" class="social-link" title="${esc(s.platform)}">
      <span class="social-icon">${esc(icons[s.platform] || '?')}</span>
      <span class="social-label">${esc(s.handle || s.platform)}</span>
    </a>
  `).join('');
}

function renderExperience(experience) {
  const list = document.getElementById('experience-list');
  if (!experience || experience.length === 0) {
    list.innerHTML = '<p class="empty-msg">No experience listed.</p>';
    return;
  }
  list.innerHTML = experience.map((exp) => {
    const start = formatDate(exp.startDate);
    const end = exp.current ? 'Present' : formatDate(exp.endDate);
    const dateStr = start && end ? `${start} — ${end}` : start || end || '';
    const tech = exp.tech && exp.tech.length > 0
      ? `<div class="tech-tags">${exp.tech.map((t) => `<span class="tech-tag">${esc(t)}</span>`).join('')}</div>` : '';
    const achList = exp.achievements && exp.achievements.length > 0
      ? `<ul class="ach-list">${exp.achievements.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : '';
    const typeBadge = exp.type ? `<span class="type-badge">${esc(exp.type)}</span>` : '';
    const currentBadge = exp.current ? `<span class="current-badge">Current</span>` : '';
    const remoteLabel = exp.remote ? ' &bull; Remote' : '';
    const locationStr = exp.location ? `<p class="item-location">${esc(exp.location)}${remoteLabel}</p>` : '';
    return `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h3 class="item-role">${esc(exp.role)} ${typeBadge} ${currentBadge}</h3>
          <p class="item-company">${exp.companyUrl ? `<a href="${esc(exp.companyUrl)}" target="_blank">${esc(exp.company)}</a>` : esc(exp.company)}</p>
          ${locationStr}
          ${dateStr ? `<p class="item-dates">${esc(dateStr)}</p>` : ''}
          ${exp.description ? `<p class="item-desc">${esc(exp.description)}</p>` : ''}
          ${achList}
          ${tech}
        </div>
      </div>
    `;
  }).join('');
}

function renderSkills(skills) {
  const container = document.getElementById('skills-content');
  if (!skills || skills.length === 0) {
    container.innerHTML = '<p class="empty-msg">No skills listed.</p>';
    return;
  }
  // Group by category
  const groups = {};
  skills.forEach((s) => {
    const cat = s.category || 'Other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(s);
  });
  container.innerHTML = Object.entries(groups).map(([cat, items]) => `
    <div class="skill-group">
      <h3 class="skill-group-title">${esc(cat)}</h3>
      <div class="skill-chips">
        ${items.map((s) => `
          <div class="skill-chip">
            <span>${esc(s.name)}</span>
            ${s.level ? `<span class="level-badge level-${esc(s.level)}">${esc(s.level)}</span>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function renderEducation(education) {
  const list = document.getElementById('education-list');
  if (!education || education.length === 0) {
    list.innerHTML = '<p class="empty-msg">No education listed.</p>';
    return;
  }
  list.innerHTML = education.map((edu) => {
    const start = formatDate(edu.startDate);
    const end = formatDate(edu.endDate);
    const dateStr = start && end ? `${start} — ${end}` : start || end || '';
    return `
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <h3 class="item-role">${edu.institutionUrl ? `<a href="${esc(edu.institutionUrl)}" target="_blank">${esc(edu.institution)}</a>` : esc(edu.institution)}</h3>
          ${(edu.degree || edu.field) ? `<p class="item-company">${esc(edu.degree || '')}${edu.field ? ' in ' + esc(edu.field) : ''}</p>` : ''}
          ${dateStr ? `<p class="item-dates">${esc(dateStr)}</p>` : ''}
          ${edu.grade ? `<p class="item-meta">Grade: ${esc(edu.grade)}</p>` : ''}
          ${edu.description ? `<p class="item-desc">${esc(edu.description)}</p>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderCertifications(certifications) {
  const grid = document.getElementById('certifications-grid');
  if (!certifications || certifications.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No certifications listed.</p>';
    return;
  }
  grid.innerHTML = certifications.map((cert) => `
    <div class="cert-card">
      <h3 class="cert-name">${esc(cert.name)}</h3>
      <p class="cert-issuer">${esc(cert.issuer)}</p>
      ${cert.issuedDate ? `<p class="cert-date">Issued: ${esc(formatDate(cert.issuedDate))}</p>` : ''}
      ${cert.expiryDate ? `<p class="cert-date">Expires: ${esc(formatDate(cert.expiryDate))}</p>` : ''}
      ${cert.credentialId ? `<p class="cert-meta">ID: ${esc(cert.credentialId)}</p>` : ''}
      ${cert.credentialUrl ? `<a href="${esc(cert.credentialUrl)}" target="_blank" class="cert-link">View credential &rarr;</a>` : ''}
    </div>
  `).join('');
}

function renderProjects(projects) {
  const grid = document.getElementById('projects-grid');
  if (!projects || projects.length === 0) {
    grid.innerHTML = '<p class="empty-msg">No projects listed.</p>';
    return;
  }
  grid.innerHTML = projects.map((p) => {
    const tagHtml = p.tags && p.tags.length > 0
      ? `<div class="tech-tags">${p.tags.map((t) => `<span class="tech-tag">${esc(t)}</span>`).join('')}</div>` : '';
    const links = [];
    if (p.liveUrl) links.push(`<a href="${esc(p.liveUrl)}" target="_blank" class="project-link">Live &rarr;</a>`);
    if (p.repoUrl) links.push(`<a href="${esc(p.repoUrl)}" target="_blank" class="project-link">Repo &rarr;</a>`);
    if (p.figmaUrl) links.push(`<a href="${esc(p.figmaUrl)}" target="_blank" class="project-link">Figma &rarr;</a>`);
    return `
      <div class="project-card">
        ${p.thumbnailUrl ? `<img src="${esc(p.thumbnailUrl)}" alt="${esc(p.title)}" class="project-thumb" />` : ''}
        <div class="project-body">
          <h3 class="project-title">${esc(p.title)}</h3>
          ${p.publicSummary ? `<p class="project-desc">${esc(p.publicSummary)}</p>` : ''}
          ${tagHtml}
          ${links.length > 0 ? `<div class="project-links">${links.join('')}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function renderAchievements(achievements) {
  const list = document.getElementById('achievements-list');
  if (!achievements || achievements.length === 0) {
    list.innerHTML = '<p class="empty-msg">No achievements listed.</p>';
    return;
  }
  list.innerHTML = `<div class="ach-items">` + achievements.map((ach) => `
    <div class="ach-item">
      <div class="ach-header">
        <h3 class="ach-title">${esc(ach.title)}</h3>
        <div class="ach-meta">
          ${ach.category ? `<span class="cat-badge">${esc(ach.category)}</span>` : ''}
          ${ach.date ? `<span class="ach-date">${esc(formatDate(ach.date))}</span>` : ''}
        </div>
      </div>
      ${ach.description ? `<p class="item-desc">${esc(ach.description)}</p>` : ''}
      ${ach.url ? `<a href="${esc(ach.url)}" target="_blank" class="cert-link">Learn more &rarr;</a>` : ''}
    </div>
  `).join('') + `</div>`;
}

function renderContact(basics, socials) {
  const container = document.getElementById('contact-content');
  const parts = [];
  if (basics.email) parts.push(`<a href="mailto:${esc(basics.email)}" class="contact-link">${esc(basics.email)}</a>`);
  if (basics.phone) parts.push(`<span class="contact-link">${esc(basics.phone)}</span>`);
  if (basics.resumeUrl) parts.push(`<a href="${esc(basics.resumeUrl)}" target="_blank" class="btn-primary">Download Resume</a>`);
  container.innerHTML = `<div class="contact-links">${parts.join('')}</div>`;
}

async function loadPortfolio() {
  try {
    const res = await fetch(`${CONFIG.API_BASE}/public/portfolio/${CONFIG.SLUG}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    portfolioData = data;

    // Apply theme
    const theme = data.settings && data.settings.theme ? data.settings.theme : 'classic';
    const themeIdx = THEMES.indexOf(theme);
    currentThemeIndex = themeIdx >= 0 ? themeIdx : 0;
    setTheme(THEMES[currentThemeIndex]);

    // Apply accent color
    if (data.settings && data.settings.accentColor) {
      document.documentElement.style.setProperty('--accent', data.settings.accentColor);
    }

    // Render sections
    const basics = data.basics || {};
    const settings = data.settings || {};
    const showSections = settings.showSections || {};

    renderHero(basics, data.interests || []);
    renderSocials(data.socials || []);

    // Show/hide sections based on settings
    const expEl = document.getElementById('experience');
    if (expEl) expEl.style.display = showSections.experience === false ? 'none' : '';
    if (showSections.experience !== false) renderExperience(data.experience || []);

    const skillsEl = document.getElementById('skills');
    if (skillsEl) skillsEl.style.display = showSections.skills === false ? 'none' : '';
    if (showSections.skills !== false) renderSkills(data.skills || []);

    const eduEl = document.getElementById('education');
    if (eduEl) eduEl.style.display = showSections.education === false ? 'none' : '';
    if (showSections.education !== false) renderEducation(data.education || []);

    const certEl = document.getElementById('certifications');
    if (certEl) certEl.style.display = showSections.certifications === false ? 'none' : '';
    if (showSections.certifications !== false) renderCertifications(data.certifications || []);

    const projEl = document.getElementById('projects');
    if (projEl) projEl.style.display = showSections.projects === false ? 'none' : '';
    if (showSections.projects !== false) renderProjects(data.projects || []);

    const achEl = document.getElementById('achievements');
    if (achEl) achEl.style.display = showSections.achievements === false ? 'none' : '';
    if (showSections.achievements !== false) renderAchievements(data.achievements || []);

    renderContact(basics, data.socials || []);

    // Show app, hide loading
    document.getElementById('loading').style.display = 'none';
    document.getElementById('app').style.display = '';

    // Smooth scroll for nav links
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
      });
    });

  } catch (err) {
    console.error('Failed to load portfolio:', err);
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').hidden = false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadPortfolio();
  document.getElementById('theme-switcher').addEventListener('click', cycleTheme);
});
