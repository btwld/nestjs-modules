import { AppContextHost } from '@concepta/nestjs-core';

import {
  createMockRoleAssignmentRepository,
  createMockAssignmentRepositoryResolver,
  createMockTransaction,
  createMockEventPublisher,
  createMockRoleAssignmentEntity,
  toRoleAssignmentDomain,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { RevokeRoleCommand } from '../../impl/revoke-role.command.js';
import { RevokeRoleHandler } from '../revoke-role.handler.js';

describe(RevokeRoleHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleAssignmentRepository>;
  let handler: RevokeRoleHandler;
  let trxHandle: ReturnType<typeof createMockTransaction>['trxHandle'];

  beforeEach(() => {
    mockRepo = createMockRoleAssignmentRepository();
    const { transaction, trxHandle: trx } = createMockTransaction();
    trxHandle = trx;

    handler = new RevokeRoleHandler(
      createMockAssignmentRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
    );
  });

  it('should revoke and remove the assignment', async () => {
    const existing = toRoleAssignmentDomain(
      createMockRoleAssignmentEntity({
        roleId: 'role-1',
        assigneeId: 'user-1',
      }),
    );
    mockRepo.findOne.mockResolvedValue(existing);

    await handler.execute(
      new RevokeRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'role-1', 'user-1'),
    );

    expect(mockRepo.findOne).toHaveBeenCalledTimes(1);
    const [findCtx, findRoleId, findAssigneeId] =
      mockRepo.findOne.mock.calls[0];
    expect(findCtx).toBeInstanceOf(AppContextHost);
    expect(findRoleId).toBe('role-1');
    expect(findAssigneeId).toBe('user-1');

    expect(mockRepo.remove).toHaveBeenCalledTimes(1);
    const [removeCtx, removeEntity] = mockRepo.remove.mock.calls[0];
    expect(removeCtx).toBeInstanceOf(AppContextHost);
    expect(removeEntity).toBe(existing);
  });

  it('should register onCommit and onRollback', async () => {
    const existing = toRoleAssignmentDomain(createMockRoleAssignmentEntity());
    mockRepo.findOne.mockResolvedValue(existing);

    await handler.execute(
      new RevokeRoleCommand(
        ctx,
        DEFAULT_ROLE_NAMESPACE,
        'test-role-id',
        'test-assignee-id',
      ),
    );

    expect(trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('should do nothing when assignment not found', async () => {
    mockRepo.findOne.mockResolvedValue(null);

    await handler.execute(
      new RevokeRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'role-1', 'user-1'),
    );

    expect(mockRepo.remove).not.toHaveBeenCalled();
  });
});
