import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { FirebaseService } from '../prisma/firebase.service';
import { BuyStatus, CreateBuyItemDto, Urgency } from './dto/create-buy-item.dto';
import { UpdateBuyItemDto } from './dto/update-buy-item.dto';

type BuyItemRecord = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  status: BuyStatus;
  urgency: Urgency;
  estimatedPrice: number | null;
  boughtPrice: number | null;
  currency: string;
  store: string | null;
  link: string | null;
  notes: string | null;
  boughtAt: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class BuyListService {
  constructor(private firebase: FirebaseService) {}

  async findAll(userId: string) {
    const items = await this.firebase.getList<BuyItemRecord>('buyItems');
    return items
      .filter((i) => i.userId === userId)
      .sort((a, b) => {
        // WANT first, then CONSIDERING, BOUGHT, SKIPPED. Within a group: HIGH urgency first, then newest.
        const order = (s: BuyStatus) =>
          s === 'WANT' ? 0 : s === 'CONSIDERING' ? 1 : s === 'BOUGHT' ? 2 : 3;
        const g = order(a.status) - order(b.status);
        if (g !== 0) return g;
        const u = (x: Urgency) => (x === 'HIGH' ? 0 : x === 'MEDIUM' ? 1 : 2);
        const ug = u(a.urgency) - u(b.urgency);
        if (ug !== 0) return ug;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }

  async findOne(userId: string, id: string) {
    const item = await this.firebase.get<BuyItemRecord>(`buyItems/${id}`);
    if (!item) throw new NotFoundException('Item not found');
    if (item.userId !== userId) throw new ForbiddenException();
    return item;
  }

  async create(userId: string, dto: CreateBuyItemDto): Promise<BuyItemRecord> {
    const id = randomUUID();
    const status = dto.status ?? 'WANT';
    const item: BuyItemRecord = {
      id,
      userId,
      name: dto.name,
      category: dto.category ?? null,
      status,
      urgency: dto.urgency ?? 'MEDIUM',
      estimatedPrice: dto.estimatedPrice ?? null,
      boughtPrice: dto.boughtPrice ?? null,
      currency: dto.currency ?? 'INR',
      store: dto.store ?? null,
      link: dto.link ?? null,
      notes: dto.notes ?? null,
      // Auto-stamp boughtAt when created already-bought.
      boughtAt: status === 'BOUGHT' ? (dto.boughtAt ?? new Date().toISOString()) : (dto.boughtAt ?? null),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this.firebase.ref(`buyItems/${id}`).set(item);
    return item;
  }

  async update(userId: string, id: string, dto: UpdateBuyItemDto): Promise<BuyItemRecord> {
    const existing = await this.findOne(userId, id);
    const patch: Record<string, any> = { updatedAt: new Date().toISOString() };
    for (const [k, v] of Object.entries(dto)) {
      if (v !== undefined) patch[k] = v;
    }
    // Auto-stamp boughtAt the moment we transition to BOUGHT (unless the client supplied one).
    if (dto.status === 'BOUGHT' && existing.status !== 'BOUGHT' && !dto.boughtAt) {
      patch.boughtAt = new Date().toISOString();
    }
    // Moving away from BOUGHT clears boughtAt + boughtPrice unless the client explicitly kept them.
    if (dto.status && dto.status !== 'BOUGHT' && existing.status === 'BOUGHT') {
      if (dto.boughtAt === undefined) patch.boughtAt = null;
      if (dto.boughtPrice === undefined) patch.boughtPrice = null;
    }
    await this.firebase.update(`buyItems/${id}`, patch);
    const updated = await this.firebase.get<BuyItemRecord>(`buyItems/${id}`);
    if (!updated) throw new NotFoundException('Item vanished mid-update');
    return updated;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.firebase.remove(`buyItems/${id}`);
    return { deleted: true };
  }
}
