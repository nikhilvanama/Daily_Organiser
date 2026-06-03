import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { CreateProjectDto, ProjectStatus } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

type ProjectRecord = {
  id: string;
  userId: string;
  title: string;
  clientName: string | null;
  clientContact: string | null;
  description: string | null;
  status: ProjectStatus;
  quotedAmount: number | null;
  currency: string;
  startDate: string | null;
  deadline: string | null;
  deliveredAt: string | null;
  progress: number;
  portfolioLinks: string[];
  archived: boolean;
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
      // Pinned-on-top order: active work first (IN_PROGRESS, QUOTED, LEAD), then DELIVERED,
      // then closed (PAID, LOST, ON_HOLD). Within a group, sort by deadline asc, missing last.
      .sort((a, b) => {
        const groupOrder = (s: ProjectStatus) =>
          s === 'IN_PROGRESS' ? 0
          : s === 'QUOTED' ? 1
          : s === 'LEAD' ? 2
          : s === 'DELIVERED' ? 3
          : s === 'ON_HOLD' ? 4
          : s === 'PAID' ? 5
          : 6; // LOST
        const g = groupOrder(a.status) - groupOrder(b.status);
        if (g !== 0) return g;
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return a.deadline.localeCompare(b.deadline);
      });
  }

  async findOne(userId: string, id: string) {
    const project = await this.firebase.get<ProjectRecord>(`projects/${id}`);
    if (!project) throw new NotFoundException('Project not found');
    if (project.userId !== userId) throw new ForbiddenException();
    const allPayments = await this.firebase.getList<PaymentRecord>('projectPayments');
    return this.enrich(project, allPayments.filter((p) => p.userId === userId));
  }

  async create(userId: string, dto: CreateProjectDto) {
    const id = randomUUID();
    const project: ProjectRecord = {
      id,
      userId,
      title: dto.title,
      clientName: dto.clientName ?? null,
      clientContact: dto.clientContact ?? null,
      description: dto.description ?? null,
      status: dto.status ?? 'LEAD',
      quotedAmount: dto.quotedAmount ?? null,
      currency: dto.currency ?? 'INR',
      startDate: dto.startDate ?? null,
      deadline: dto.deadline ?? null,
      deliveredAt: null,
      progress: dto.progress ?? 0,
      portfolioLinks: dto.portfolioLinks ?? [],
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.firebase.ref(`projects/${id}`).set(project);
    return this.enrich(project, []);
  }

  async update(userId: string, id: string, dto: UpdateProjectDto) {
    const existing = await this.ensureOwnership(userId, id);
    const patch: Record<string, any> = { ...dto, updatedAt: new Date().toISOString() };
    // When the user flips status to DELIVERED, stamp deliveredAt; when flipped away, clear it.
    if (dto.status && dto.status !== existing.status) {
      if (dto.status === 'DELIVERED' || dto.status === 'PAID') {
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
  private enrich(project: ProjectRecord, allUserPayments: PaymentRecord[]) {
    const payments = allUserPayments
      .filter((p) => p.projectId === project.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const totalReceived = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const quoted = project.quotedAmount ?? 0;
    const balance = Math.max(0, quoted - totalReceived);
    const todayKey = new Date().toISOString().split('T')[0];
    const isOverdue = !!project.deadline && project.deadline < todayKey
      && project.status !== 'PAID' && project.status !== 'LOST';
    return {
      ...project,
      payments,
      totalReceived: Math.round(totalReceived * 100) / 100,
      balance: Math.round(balance * 100) / 100,
      isOverdue,
    };
  }
}
