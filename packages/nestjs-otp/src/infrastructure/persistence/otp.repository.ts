import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';
import { type RepositoryInterface, Where } from '@concepta/nestjs-repository';

import { type Otp } from '../../domain/aggregates/otp.js';
import { type OtpRepositoryInterface } from '../../domain/repositories/otp-repository.interface.js';

import { type OtpEntityInterface } from './interfaces/otp-entity.interface.js';
import { type OtpMapper } from './otp.mapper.js';

export class OtpRepository implements OtpRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<OtpEntityInterface>,
    private readonly mapper: OtpMapper,
  ) {}

  async get(ctx: PlainLiteralObject, id: ReferenceId): Promise<Otp | null> {
    const w = Where.for<OtpEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('id', id),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findActiveByPasscode(
    ctx: PlainLiteralObject,
    options: { category: string; passcode: string },
  ): Promise<Otp | null> {
    const { category, passcode } = options;
    const w = Where.for<OtpEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.and(
        w.eq('category', category),
        w.eq('passcode', passcode),
        w.eq('active', true),
      ),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findByPasscode(
    ctx: PlainLiteralObject,
    options: { category: string; passcode: string },
  ): Promise<Otp | null> {
    const { category, passcode } = options;
    const w = Where.for<OtpEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.and(w.eq('category', category), w.eq('passcode', passcode)),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findActiveByAssignee(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string },
  ): Promise<Otp | null> {
    const { assigneeId, category } = options;
    const w = Where.for<OtpEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.and(
        w.eq('assigneeId', assigneeId),
        w.eq('category', category),
        w.eq('active', true),
      ),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAllByAssigneeAndCategory(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string },
  ): Promise<Otp[]> {
    const { assigneeId, category } = options;
    const w = Where.for<OtpEntityInterface>();

    const entities = await this.repository.find({
      where: w.and(w.eq('assigneeId', assigneeId), w.eq('category', category)),
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async countCreatedSince(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string; cutoffDate: Date },
  ): Promise<number> {
    const { assigneeId, category, cutoffDate } = options;
    const w = Where.for<OtpEntityInterface>();

    return this.repository.count({
      where: w.and(
        w.eq('assigneeId', assigneeId),
        w.eq('category', category),
        w.gte('dateCreated', cutoffDate),
      ),
      ctx,
    });
  }

  async findOlderThan(
    ctx: PlainLiteralObject,
    options: { assigneeId: string; category: string; cutoffDate: Date },
  ): Promise<Otp[]> {
    const { assigneeId, category, cutoffDate } = options;
    const w = Where.for<OtpEntityInterface>();

    const entities = await this.repository.find({
      where: w.and(
        w.eq('assigneeId', assigneeId),
        w.eq('category', category),
        w.lte('dateCreated', cutoffDate),
      ),
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(ctx: PlainLiteralObject, otp: Otp): Promise<void> {
    otp.stampUpdated();
    await this.repository.upsert(this.mapper.toPersistence(otp), { ctx });
  }

  async remove(ctx: PlainLiteralObject, otp: Otp): Promise<void> {
    await this.repository.delete(this.mapper.toPersistence(otp), { ctx });
  }

  async removeAll(ctx: PlainLiteralObject, otps: Otp[]): Promise<void> {
    await this.repository.deleteMany(
      otps.map((otp) => this.mapper.toPersistence(otp)),
      { ctx },
    );
  }
}
