export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ExperienceType = 'fulltime' | 'parttime' | 'internship' | 'freelance' | 'contract' | 'volunteer';
export type PortfolioTheme = 'classic' | 'minimal' | 'developer';
export type SocialPlatform = 'github' | 'linkedin' | 'twitter' | 'instagram' | 'youtube' | 'dribbble' | 'behance' | 'figma' | 'website' | 'other';

export interface PortfolioBasics {
  slug?: string;
  name?: string;
  headline?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  availableForHire?: boolean;
  published?: boolean;
}

export interface PortfolioSettings {
  theme: PortfolioTheme;
  accentColor: string;
  showSections: {
    skills: boolean;
    education: boolean;
    experience: boolean;
    certifications: boolean;
    achievements: boolean;
    interests: boolean;
    projects: boolean;
  };
}

export interface PortfolioSocial {
  id: string;
  platform: SocialPlatform;
  url: string;
  handle?: string;
  order?: number;
}

export interface PortfolioSkill {
  id: string;
  name: string;
  category?: string;
  level?: SkillLevel;
  yearsOfExperience?: number;
  featured?: boolean;
  order?: number;
}

export interface PortfolioEducation {
  id: string;
  institution: string;
  degree?: string;
  field?: string;
  startDate?: string;
  endDate?: string;
  grade?: string;
  description?: string;
  achievements?: string[];
  institutionUrl?: string;
  order?: number;
}

export interface PortfolioExperience {
  id: string;
  company: string;
  role: string;
  type?: ExperienceType;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  location?: string;
  remote?: boolean;
  description?: string;
  achievements?: string[];
  tech?: string[];
  companyUrl?: string;
  order?: number;
}

export interface PortfolioCertification {
  id: string;
  name: string;
  issuer: string;
  issuedDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
  credentialId?: string;
  imageUrl?: string;
  featured?: boolean;
  order?: number;
}

export interface PortfolioAchievement {
  id: string;
  title: string;
  description?: string;
  date?: string;
  category?: string;
  imageUrl?: string;
  url?: string;
  featured?: boolean;
  order?: number;
}

export interface MyPortfolio {
  basics: PortfolioBasics;
  settings: PortfolioSettings;
  interests: string[];
  socials: PortfolioSocial[];
  skills: PortfolioSkill[];
  education: PortfolioEducation[];
  experience: PortfolioExperience[];
  certifications: PortfolioCertification[];
  achievements: PortfolioAchievement[];
}

export const SKILL_CATEGORIES = ['Frontend', 'Backend', 'Database', 'DevOps', 'Design', 'Mobile', 'Tools', 'Soft Skills', 'Other'];
export const SKILL_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' },
];
export const EXPERIENCE_TYPES: { value: ExperienceType; label: string }[] = [
  { value: 'fulltime', label: 'Full-time' },
  { value: 'parttime', label: 'Part-time' },
  { value: 'internship', label: 'Internship' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'contract', label: 'Contract' },
  { value: 'volunteer', label: 'Volunteer' },
];
export const SOCIAL_PLATFORMS: { value: SocialPlatform; label: string; icon: string }[] = [
  { value: 'github', label: 'GitHub', icon: 'GH' },
  { value: 'linkedin', label: 'LinkedIn', icon: 'in' },
  { value: 'twitter', label: 'Twitter / X', icon: 'X' },
  { value: 'instagram', label: 'Instagram', icon: 'IG' },
  { value: 'youtube', label: 'YouTube', icon: 'YT' },
  { value: 'dribbble', label: 'Dribbble', icon: 'Dr' },
  { value: 'behance', label: 'Behance', icon: 'Be' },
  { value: 'figma', label: 'Figma', icon: 'Fi' },
  { value: 'website', label: 'Website', icon: 'W' },
  { value: 'other', label: 'Other', icon: '...' },
];
