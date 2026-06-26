import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { CreateProjectDto, PaymentStatus, ProjectStatus } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { slugify, UUID_RE } from '../common/slugify';

type ProjectRecord = {
  id: string;
  userId: string;
  title: string;
  isSelf: boolean;
  projectType: string | null;
  clientName: string | null;
  clientContact: string | null;
  description: string | null;
  status: ProjectStatus;
  paymentStatus: PaymentStatus;
  quotedAmount: number | null;
  currency: string;
  startDate: string | null;
  deadline: string | null;
  deliveredAt: string | null;
  progress: number;
  portfolioLinks: string[];
  archived: boolean;
  showInPortfolio: boolean;
  publicSummary: string | null;
  thumbnailUrl: string | null;
  liveUrl: string | null;
  repoUrl: string | null;
  figmaUrl: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

type PaymentRecord = {
  id: string;
  projectId: string;
  userId: string;
  amount: number;
  currency: string;
  date: string; // YYYY-MM-DD
  note: string | null;
  method: string | null;
  createdAt: string;
};

@Injectable()
export class ProjectsService {
  constructor(private firebase: FirebaseService) {}

  async findAll(userId: string) {
    const [projects, payments] = await Promise.all([
      this.firebase.getList<ProjectRecord>('projects'),
      this.firebase.getList<PaymentRecord>('projectPayments'),
    ]);
    const userProjects = projects.filter((p) => p.userId === userId && !p.archived);
    const userPayments = payments.filter((p) => p.userId === userId);
    return userProjects
      .map((p) => this.enrich(p, userPayments))
      // Pinned-on-top order: active work first (IN_PROGRESS, QUOTED, LEAD), then DELIVERED
      // (work done but maybe payment pending), then ON_HOLD, then LOST. Within a group,
      // sort by deadline asc with missing-deadline last.
      .sort((a, b) => {
        const groupOrder = (s: ProjectStatus) =>
          s === 'IN_PROGRESS' ? 0
          : s === 'QUOTED' ? 1
          : s === 'LEAD' ? 2
          : s === 'DELIVERED' ? 3
          : s === 'ON_HOLD' ? 4
          : 5; // LOST
        const g = groupOrder(a.status) - groupOrder(b.status);
        if (g !== 0) return g;
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
  }

  async findOne(userId: string, idOrSlug: string) {
    // Try direct UUID lookup first (fast path)
    if (UUID_RE.test(idOrSlug)) {
      const project = await this.firebase.get<ProjectRecord>(`projects/${idOrSlug}`);
      if (project && project.userId === userId) {
        const allPayments = await this.firebase.getList<PaymentRecord>('projectPayments');
        return this.enrich(project, allPayments.filter((p) => p.userId === userId));
      }
    }
    // Slug search: find user project whose title slugifies to idOrSlug
    const all = await this.firebase.getList<ProjectRecord>('projects');
    const project = all.find(
      (p) => p.userId === userId && !p.archived && slugify(p.title) === idOrSlug,
    );
    if (!project) throw new NotFoundException('Project not found');
    const allPayments = await this.firebase.getList<PaymentRecord>('projectPayments');
    return this.enrich(project, allPayments.filter((p) => p.userId === userId));
  }

  async create(userId: string, dto: CreateProjectDto) {
    const id = randomUUID();
    const isSelf = !!dto.isSelf;
    const project: ProjectRecord = {
      id,
      userId,
      title: dto.title,
      isSelf,
      projectType: dto.projectType ?? null,
      // Self projects don't carry client/payment fields, even if the client sends them.
      clientName: isSelf ? null : dto.clientName ?? null,
      clientContact: isSelf ? null : dto.clientContact ?? null,
      description: dto.description ?? null,
      status: dto.status ?? 'LEAD',
      paymentStatus: isSelf ? 'NOT_APPLICABLE' : (dto.paymentStatus ?? 'PENDING'),
      quotedAmount: isSelf ? null : dto.quotedAmount ?? null,
      currency: dto.currency ?? 'INR',
      startDate: dto.startDate ?? null,
      deadline: dto.deadline ?? null,
      deliveredAt: null,
      progress: dto.progress ?? 0,
      portfolioLinks: dto.portfolioLinks ?? [],
      archived: false,
      showInPortfolio: dto.showInPortfolio ?? false,
      publicSummary: dto.publicSummary ?? null,
      thumbnailUrl: dto.thumbnailUrl ?? null,
      liveUrl: dto.liveUrl ?? null,
      repoUrl: dto.repoUrl ?? null,
      figmaUrl: dto.figmaUrl ?? null,
      tags: dto.tags ?? [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.firebase.ref(`projects/${id}`).set(project);
    return this.enrich(project, []);
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const existing = await this.ensureOwnership(userId, id);
    const patch: Record<string, any> = { updatedAt: new Date().toISOString() };

    // Copy every defined field into the patch — Firebase Admin SDK rejects `undefined` values,
    // so we skip undefined and explicitly carry through null where the client asks to clear.
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) patch[k] = v;
    }

    // Flipping to self project clears client and payment fields.
    if (dto.isSelf === true && !existing.isSelf) {
      patch.clientName = null;
      patch.clientContact = null;
      patch.quotedAmount = null;
      patch.paymentStatus = 'NOT_APPLICABLE';
    }
    // Flipping away from self project resets paymentStatus to a sensible default.
    if (dto.isSelf === false && existing.isSelf) {
      if (!dto.paymentStatus) patch.paymentStatus = 'PENDING';
    }

    // When the user flips status to DELIVERED, stamp deliveredAt; when flipped away, clear it.
    if (dto.status && dto.status !== existing.status) {
      if (dto.status === 'DELIVERED') {
        patch.deliveredAt = existing.deliveredAt ?? new Date().toISOString();
      } else if (existing.status === 'DELIVERED') {
        patch.deliveredAt = null;
      }
    }
    await this.firebase.update(`projects/${id}`, patch);
    const updated = await this.firebase.get<ProjectRecord>(`projects/${id}`);
    const allPayments = await this.firebase.getList<PaymentRecord>('projectPayments');
    return this.enrich(updated!, allPayments.filter((p) => p.userId === userId));
  }

  async remove(userId: string, id: string) {
    await this.ensureOwnership(userId, id);
    // Cascade delete this project's payments
    const payments = await this.firebase.getList<PaymentRecord>('projectPayments');
    for (const p of payments) {
      if (p.projectId === id) await this.firebase.remove(`projectPayments/${p.id}`);
    }
    await this.firebase.remove(`projects/${id}`);
    return { deleted: true };
  }

  // --- Payments ---

  async addPayment(userId: string, projectId: string, dto: CreatePaymentDto) {
    const project = await this.ensureOwnership(userId, projectId);
    if (project.isSelf) {
      throw new ForbiddenException('Self projects do not track payments');
    }
    const id = randomUUID();
    const payment: PaymentRecord = {
      id,
      projectId,
      userId,
      amount: dto.amount,
      currency: dto.currency ?? project.currency,
      date: dto.date,
      note: dto.note ?? null,
      method: dto.method ?? null,
      createdAt: new Date().toISOString(),
    };
    await this.firebase.ref(`projectPayments/${id}`).set(payment);
    return this.findOne(userId, projectId);
  }

  async removePayment(userId: string, projectId: string, paymentId: string) {
    await this.ensureOwnership(userId, projectId);
    const payment = await this.firebase.get<PaymentRecord>(`projectPayments/${paymentId}`);
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.userId !== userId) throw new ForbiddenException();
    if (payment.projectId !== projectId) throw new NotFoundException('Payment not found on this project');
    await this.firebase.remove(`projectPayments/${paymentId}`);
    return this.findOne(userId, projectId);
  }

  // --- Helpers ---

  private async ensureOwnership(userId: string, id: string): Promise<ProjectRecord> {
    const project = await this.firebase.get<ProjectRecord>(`projects/${id}`);
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException();
    return project;
  }

  // Attaches payments + computed totals/balance/overdue flag.
  // Also migrates legacy fields on read (no DB rewrite — the response just looks correct):
  //   - status === 'PAID' (old combined status) → status: 'DELIVERED' + paymentStatus: 'PAID'
  //   - missing isSelf → false
  //   - missing paymentStatus → derive from status / amounts
  private enrich(project: ProjectRecord, allUserPayments: PaymentRecord[]) {
    const payments = project.isSelf
      ? []
      : allUserPayments
          .filter((p) => p.projectId === project.id)
          .sort((a, b) => b.date.localeCompare(a.date));
    const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const quoted = project.quotedAmount ?? 0;
    const balance = Math.max(0, quoted - totalReceived);
    const todayKey = new Date().toISOString().split('T')[0];

    // ---- Legacy migration applied at read time ----
    let migratedStatus: ProjectStatus = (project.status as any) === 'PAID'
      ? 'DELIVERED'
      : (project.status ?? 'LEAD');
    let migratedPaymentStatus: PaymentStatus = project.paymentStatus
      ?? ((project.status as any) === 'PAID' ? 'PAID'
        : project.isSelf ? 'NOT_APPLICABLE'
        : totalReceived >= quoted && quoted > 0 ? 'PAID'
        : totalReceived > 0 ? 'PARTIAL'
        : 'PENDING');
    const isSelf = project.isSelf ?? false;
    if (isSelf) migratedPaymentStatus = 'NOT_APPLICABLE';

    const isOverdue = !!project.deadline && project.deadline < todayKey
      && migratedStatus !== 'DELIVERED' && migratedStatus !== 'LOST';

    return {
      ...project,
      isSelf,
      status: migratedStatus,
      paymentStatus: migratedPaymentStatus,
      payments,
      totalReceived: Math.round(totalReceived * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      isOverdue,
      showInPortfolio: project.showInPortfolio ?? false,
      publicSummary: project.publicSummary ?? null,
      thumbnailUrl: project.thumbnailUrl ?? null,
      liveUrl: project.liveUrl ?? null,
      repoUrl: project.repoUrl ?? null,
      figmaUrl: project.figmaUrl ?? null,
      tags: project.tags ?? [],
    };
  }
}
