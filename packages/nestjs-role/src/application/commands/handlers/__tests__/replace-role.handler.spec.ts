import {
  createMockRoleRepository,
  createMockRoleRepositoryResolver,
  createMockTransaction,
  createMockEventPublisher,
  createMockRoleEntity,
  toRoleDomain,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Role } from '../../../../domain/aggregates/role.js';
import { ReplaceRoleCommand } from '../../impl/replace-role.command.js';
import { ReplaceRoleHandler } from '../replace-role.handler.js';

describe(ReplaceRoleHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleRepository>;
  let handler: ReplaceRoleHandler;
  let trxHandle: ReturnType<typeof createMockTransaction>['trxHandle'];

  beforeEach(() => {
    mockRepo = createMockRoleRepository();
    const { transaction, trxHandle: trx } = createMockTransaction();
    trxHandle = trx;

    handler = new ReplaceRoleHandler(
      createMockRoleRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
    );
  });

  it('should replace an existing role', async () => {
    const existing = toRoleDomain(
      createMockRoleEntity({ name: 'OldName', description: 'OldDesc' }),
    );
    mockRepo.get.mockResolvedValue(existing);

    const dto = { name: 'NewName', description: 'NewDesc' };
    const result = await handler.execute(
      new ReplaceRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id', dto),
    );

    expect(result).toBeInstanceOf(Role);
    expect(result.name).toBe('NewName');
    expect(result.description).toBe('NewDesc');
  });

  it('should save and return the replaced role', async () => {
    const existing = toRoleDomain(
      createMockRoleEntity({ name: 'OldName', description: 'OldDesc' }),
    );
    mockRepo.get.mockResolvedValue(existing);

    const dto = { name: 'NewName', description: 'NewDesc' };
    const result = await handler.execute(
      new ReplaceRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id', dto),
    );

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.toPlain()).toEqual({
      id: 'test-role-id',
      name: 'NewName',
      description: 'NewDesc',
      dateCreated: new Date('2026-01-01'),
      dateUpdated: expect.any(Date),
      dateDeleted: null,
      version: 2,
    });
  });

  it('should create a new role when none exists', async () => {
    mockRepo.get.mockResolvedValue(null);

    const dto = { name: 'Brand New', description: 'Created via replace' };
    const result = await handler.execute(
      new ReplaceRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'new-role-id', dto),
    );

    expect(result).toBeInstanceOf(Role);
    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.toPlain()).toEqual({
      id: 'new-role-id',
      name: 'Brand New',
      description: 'Created via replace',
      dateCreated: expect.any(Date),
      dateUpdated: expect.any(Date),
      dateDeleted: null,
      version: 1,
    });
  });

  it('should register onCommit and onRollback', async () => {
    const existing = toRoleDomain(createMockRoleEntity());
    mockRepo.get.mockResolvedValue(existing);

    const dto = { name: 'Replaced', description: 'Replaced' };
    await handler.execute(
      new ReplaceRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id', dto),
    );

    expect(trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });
});
