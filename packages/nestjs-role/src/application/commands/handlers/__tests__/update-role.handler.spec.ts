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
import { RoleNotFoundException } from '../../../exceptions/role-not-found.exception.js';
import { UpdateRoleCommand } from '../../impl/update-role.command.js';
import { UpdateRoleHandler } from '../update-role.handler.js';

describe(UpdateRoleHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleRepository>;
  let handler: UpdateRoleHandler;
  let trxHandle: ReturnType<typeof createMockTransaction>['trxHandle'];

  beforeEach(() => {
    mockRepo = createMockRoleRepository();
    const { transaction, trxHandle: trx } = createMockTransaction();
    trxHandle = trx;

    handler = new UpdateRoleHandler(
      createMockRoleRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
    );
  });

  it('should return an updated Role instance', async () => {
    const existing = toRoleDomain(
      createMockRoleEntity({ name: 'OldName', description: 'OldDesc' }),
    );
    mockRepo.get.mockResolvedValue(existing);

    const dto = { name: 'NewName' };
    const result = await handler.execute(
      new UpdateRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id', dto),
    );

    expect(result).toBeInstanceOf(Role);
    expect(result.name).toBe('NewName');
    expect(result.description).toBe('OldDesc');
  });

  it('should save and return the updated role', async () => {
    const existing = toRoleDomain(
      createMockRoleEntity({ name: 'OldName', description: 'OldDesc' }),
    );
    mockRepo.get.mockResolvedValue(existing);

    const dto = { name: 'NewName', description: 'NewDesc' };
    const result = await handler.execute(
      new UpdateRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id', dto),
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

  it('should register onCommit and onRollback', async () => {
    const existing = toRoleDomain(createMockRoleEntity());
    mockRepo.get.mockResolvedValue(existing);

    const dto = { name: 'Updated' };
    await handler.execute(
      new UpdateRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id', dto),
    );

    expect(trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('should throw RoleNotFoundException when role does not exist', async () => {
    mockRepo.get.mockResolvedValue(null);

    const dto = { name: 'NewName' };
    await expect(
      handler.execute(
        new UpdateRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'missing-id', dto),
      ),
    ).rejects.toThrow(RoleNotFoundException);
  });
});
