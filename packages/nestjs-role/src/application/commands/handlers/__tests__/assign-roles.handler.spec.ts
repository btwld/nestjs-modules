import {
  createMockRoleAssignmentRepository,
  createMockAssignmentRepositoryResolver,
  createMockTransaction,
  createMockEventPublisher,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { type RoleAssignedEvent } from '../../../../domain/events/role-assigned.event.js';
import { RoleAssignmentsConflictException } from '../../../exceptions/role-assignments-conflict.exception.js';
import { AssignRolesCommand } from '../../impl/assign-roles.command.js';
import { AssignRolesHandler } from '../assign-roles.handler.js';

describe(AssignRolesHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleAssignmentRepository>;
  let handler: AssignRolesHandler;
  let trxHandle: ReturnType<typeof createMockTransaction>['trxHandle'];

  beforeEach(() => {
    mockRepo = createMockRoleAssignmentRepository();
    const { transaction, trxHandle: trx } = createMockTransaction();
    trxHandle = trx;

    handler = new AssignRolesHandler(
      createMockAssignmentRepositoryResolver(mockRepo),
      transaction as never,
      createMockEventPublisher() as never,
    );
  });

  it('should create and save multiple role assignments', async () => {
    mockRepo.countByRoleIdsAndAssignee.mockResolvedValue(0);

    const result = await handler.execute(
      new AssignRolesCommand(
        ctx,
        DEFAULT_ROLE_NAMESPACE,
        ['role-1', 'role-2'],
        'user-1',
      ),
    );

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.toPlain())).toEqual([
      {
        id: expect.any(String),
        roleId: 'role-1',
        assigneeId: 'user-1',
        dateCreated: expect.any(Date),
        dateUpdated: expect.any(Date),
        dateDeleted: null,
        version: 1,
      },
      {
        id: expect.any(String),
        roleId: 'role-2',
        assigneeId: 'user-1',
        dateCreated: expect.any(Date),
        dateUpdated: expect.any(Date),
        dateDeleted: null,
        version: 1,
      },
    ]);

    expect(mockRepo.saveMany).toHaveBeenCalledTimes(1);
  });

  it('should register onCommit and onRollback', async () => {
    mockRepo.countByRoleIdsAndAssignee.mockResolvedValue(0);

    await handler.execute(
      new AssignRolesCommand(ctx, DEFAULT_ROLE_NAMESPACE, ['role-1'], 'user-1'),
    );

    expect(trxHandle.onCommit).toHaveBeenCalledTimes(1);
    expect(trxHandle.onRollback).toHaveBeenCalledTimes(1);
  });

  it('should share one correlationId/causationId across all resulting events', async () => {
    mockRepo.countByRoleIdsAndAssignee.mockResolvedValue(0);

    const result = await handler.execute(
      new AssignRolesCommand(
        ctx,
        DEFAULT_ROLE_NAMESPACE,
        ['role-1', 'role-2'],
        'user-1',
      ),
    );

    const eventContexts = result.map((roleAssignment) => {
      const [event] = roleAssignment.getUncommittedEvents() as [
        RoleAssignedEvent,
      ];
      return event.eventContext;
    });

    const [first, ...rest] = eventContexts;
    for (const eventContext of rest) {
      expect(eventContext.getHeader('correlationId')).toBe(
        first.getHeader('correlationId'),
      );
      expect(eventContext.getHeader('causationId')).toBe(
        first.getHeader('causationId'),
      );
    }
  });

  it('should throw RoleAssignmentsConflictException when any already assigned', async () => {
    mockRepo.countByRoleIdsAndAssignee.mockResolvedValue(1);

    await expect(
      handler.execute(
        new AssignRolesCommand(
          ctx,
          DEFAULT_ROLE_NAMESPACE,
          ['role-1', 'role-2'],
          'user-1',
        ),
      ),
    ).rejects.toThrow(RoleAssignmentsConflictException);
  });
});
