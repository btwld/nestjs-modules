import { type PlainLiteralObject } from '@nestjs/common';

import { type ReferenceId } from '@concepta/nestjs-core';
import {
  type RepositoryInterface,
  type WhereClause,
  Where,
} from '@concepta/nestjs-repository';

import { type File } from '../../domain/aggregates/file.js';
import { type FileGetOptionsInterface } from '../../domain/interfaces/file-get-options.interface.js';
import { type FileReadOptionsInterface } from '../../domain/interfaces/file-read-options.interface.js';
import { type FileRepositoryInterface } from '../../domain/repositories/file-repository.interface.js';

import { type FileMapper } from './file.mapper.js';
import { type FileEntityInterface } from './interfaces/file-entity.interface.js';

export class FileRepository implements FileRepositoryInterface {
  constructor(
    protected readonly repository: RepositoryInterface<FileEntityInterface>,
    protected readonly mapper: FileMapper,
  ) {}

  async get(
    ctx: PlainLiteralObject,
    id: ReferenceId,
    options: FileGetOptionsInterface = {},
  ): Promise<File | null> {
    const w = Where.for<FileEntityInterface>();

    const entity = await this.repository.findOne({
      where: this.withStatus(w.eq('id', id), options),
      withDeleted: options.withDeleted,
      ctx,
    });

    return entity ? this.mapper.toDomain(entity) : null;
  }

  async create(ctx: PlainLiteralObject, file: File): Promise<void> {
    // Insert-only: an id that is already taken is refused, never overwritten.
    await this.repository.create(this.mapper.toPersistence(file), { ctx });
  }

  async updateStatus(ctx: PlainLiteralObject, file: File): Promise<File> {
    // `update` guards on the version of the row as read; `upsert` would not.
    file.stampUpdated();
    const { status, dateUpdated } = file.toPlain();

    const entity = await this.repository.update(
      this.mapper.toPersistence(file),
      { status, dateUpdated },
      { ctx },
    );

    return this.mapper.toDomain(entity);
  }

  async softDelete(ctx: PlainLiteralObject, file: File): Promise<File> {
    // Handed the row as read: the adapter treats a row that already has a
    // delete date as soft-deleted and writes nothing.
    const entity = await this.repository.softDelete(
      this.mapper.toPersistence(file),
      { expectedVersion: file.version, ctx },
    );

    return this.mapper.toDomain(entity);
  }

  async restore(ctx: PlainLiteralObject, file: File): Promise<File> {
    const entity = await this.repository.restore(
      this.mapper.toPersistence(file),
      { expectedVersion: file.version, ctx },
    );

    return this.mapper.toDomain(entity);
  }

  async remove(ctx: PlainLiteralObject, file: File): Promise<void> {
    await this.repository.delete(this.mapper.toPersistence(file), {
      expectedVersion: file.version,
      ctx,
    });
  }

  private withStatus(
    clause: WhereClause,
    options: FileReadOptionsInterface,
  ): WhereClause {
    if (!options.status) {
      return clause;
    }

    const w = Where.for<FileEntityInterface>();

    return w.and(clause, w.in('status', options.status));
  }
}
