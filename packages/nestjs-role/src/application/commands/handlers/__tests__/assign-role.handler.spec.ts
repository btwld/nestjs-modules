import {
  createMockRoleAssignmentRepository,
  createMockAssignmentRepositoryResolver,
  createMockTransaction,
  createMockEventPublisher,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { RoleAssignmentConflictException } from '../../../exceptions/role-assignment-conflict.exception.js';
import { AssignRoleCommand } from '../../impl/assign-role.command.js';
import { AssignRoleHandler } from '../assign-role.handler.js';

describe(AssignRoleHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleAssignmentRepository>;
  let handler: AssignRoleHandler;
  let trxHandle: ReturnType<typeof createMockTransaction>['trxHandle'];

  beforeEach(() => {
    mockRepo = createMockRoleAssignmentRepository();
    const { transaction, trxHandle: trx } = createMockTransaction();
    trxHandle = trx;

    handler = new AssignRoleHandler(
      createMockAssignmentRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
    );
  });

  it('should create and save a role assignment', async () => {
    mockRepo.countByRoleIdAndAssignee.mockResolvedValue(0);

    const result = await handler.execute(
      new AssignRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'role-1', 'user-1'),
    );

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(result.toPlain()).toEqual({
      id: expect.any(String),
      roleId: 'role-1',
      assigneeId: 'user-1',
      dateCreated: expect.any(Date),
      dateUpdated: expect.any(Date),
      dateDeleted: null,
      version: 1,
    });
  });

  it('should register onCommit and onRollback', async () => {
    mockRepo.countByRoleIdAndAssignee.mockResolvedValue(0);

    await handler.execute(
      new AssignRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'role-1', 'user-1'),
    );

    expect(trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('should throw RoleAssignmentConflictException when already assigned', async () => {
    mockRepo.countByRoleIdAndAssignee.mockResolvedValue(1);

    await expect(
      handler.execute(
        new AssignRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'role-1', 'user-1'),
      ),
    ).rejects.toThrow(RoleAssignmentConflictException);
  });
});
