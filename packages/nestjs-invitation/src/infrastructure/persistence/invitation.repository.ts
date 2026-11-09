import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';
import { type RepositoryInterface, Where } from '@concepta/nestjs-repository';

import { type Invitation } from '../../domain/aggregates/invitation.js';
import { type InvitationRepositoryInterface } from '../../domain/repositories/invitation-repository.interface.js';

import { type InvitationEntityInterface } from './interfaces/invitation-entity.interface.js';
import { type InvitationMapper } from './invitation.mapper.js';

export class InvitationRepository implements InvitationRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<InvitationEntityInterface>,
    private readonly mapper: InvitationMapper,
  ) {}

  async get(
    ctx: PlainLiteralObject,
    id: ReferenceId,
  ): Promise<Invitation | null> {
    const w = Where.for<InvitationEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('id', id),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findOneByCode(
    ctx: PlainLiteralObject,
    code: string,
  ): Promise<Invitation | null> {
    const w = Where.for<InvitationEntityInterface>();

    const entity = await this.repository.findOne({
      where: w.eq('code', code),
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async findAllByUserAndCategory(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
    category: string,
  ): Promise<Invitation[]> {
    const w = Where.for<InvitationEntityInterface>();

    const entities = await this.repository.find({
      where: w.and(w.eq('userId', userId), w.eq('category', category)),
      ctx,
    });

    return entities.map((e) => this.mapper.toDomain(e));
  }

  async save(ctx: PlainLiteralObject, invitation: Invitation): Promise<void> {
    invitation.stampUpdated();
    await this.repository.upsert(this.mapper.toPersistence(invitation), {
      ctx,
    });
  }

  async remove(ctx: PlainLiteralObject, invitation: Invitation): Promise<void> {
    await this.repository.delete(this.mapper.toPersistence(invitation), {
      ctx,
    });
  }
}
