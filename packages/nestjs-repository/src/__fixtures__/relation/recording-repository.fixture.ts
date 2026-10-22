import { type DeepPartial } from '@concepta/nestjs-core';

import { type RepositoryMetadataInterface } from '../../repository/interfaces/repository-metadata.interface.js';
import { RepositoryAdapter } from '../../repository/repository-adapter.js';

import { EMPLOYEE_METADATA, type EmployeeFixture } from './employee.fixture.js';

/**
 * Records what each write hands the driver: `written` holds the payloads,
 * `targets` the rows an update was aimed at, and `removed` the rows a delete,
 * soft delete or restore acted on.
 */
export class RecordingRepositoryFixture extends RepositoryAdapter<EmployeeFixture> {
  readonly metadata: RepositoryMetadataInterface<EmployeeFixture> =
    EMPLOYEE_METADATA;
  readonly written: DeepPartial<EmployeeFixture>[] = [];
  readonly targets: EmployeeFixture[] = [];
  readonly removed: EmployeeFixture[] = [];

  protected async doFind(): Promise<EmployeeFixture[]> {
    return [];
  }
  protected async doFindOne(): Promise<EmployeeFixture | null> {
    return null;
  }
  protected async doCount(): Promise<number> {
    return 0;
  }
  protected async doFindAndCount(): Promise<[EmployeeFixture[], number]> {
    return [[], 0];
  }
  protected async doCreate(
    entity: DeepPartial<EmployeeFixture>,
  ): Promise<EmployeeFixture> {
    this.written.push(entity);
    return this.toRow(entity);
  }
  protected async doCreateMany(
    entities: DeepPartial<EmployeeFixture>[],
  ): Promise<EmployeeFixture[]> {
    this.written.push(...entities);
    return entities.map((entity) => this.toRow(entity));
  }
  protected async doUpdate(
    entity: EmployeeFixture,
    data: DeepPartial<EmployeeFixture>,
  ): Promise<EmployeeFixture> {
    this.targets.push(entity);
    this.written.push(data);
    return entity;
  }
  protected async doUpsert(
    entity: DeepPartial<EmployeeFixture>,
  ): Promise<EmployeeFixture> {
    this.written.push(entity);
    return this.toRow(entity);
  }
  protected async doReplace(
    entity: EmployeeFixture,
    data: DeepPartial<EmployeeFixture>,
  ): Promise<EmployeeFixture> {
    this.written.push(data);
    return entity;
  }
  protected async doDelete(entity: EmployeeFixture): Promise<EmployeeFixture> {
    this.removed.push(entity);
    return entity;
  }
  protected async doDeleteMany(
    entities: EmployeeFixture[],
  ): Promise<EmployeeFixture[]> {
    this.removed.push(...entities);
    return entities;
  }
  protected async doSoftDelete(
    entity: EmployeeFixture,
  ): Promise<EmployeeFixture> {
    this.removed.push(entity);
    return entity;
  }
  protected async doRestore(entity: EmployeeFixture): Promise<EmployeeFixture> {
    this.removed.push(entity);
    return entity;
  }
  toRow(entityLike: DeepPartial<EmployeeFixture>): EmployeeFixture {
    return { id: '', ...entityLike };
  }
}
