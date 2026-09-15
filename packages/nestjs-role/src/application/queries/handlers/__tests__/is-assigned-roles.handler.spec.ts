import {
  createMockRoleAssignmentRepository,
  createMockAssignmentRepositoryResolver,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { IsAssignedRolesQuery } from '../../impl/is-assigned-roles.query.js';
import { IsAssignedRolesHandler } from '../is-assigned-roles.handler.js';

describe(IsAssignedRolesHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleAssignmentRepository>;
  let handler: IsAssignedRolesHandler;

  beforeEach(() => {
    mockRepo = createMockRoleAssignmentRepository();

    handler = new IsAssignedRolesHandler(
      createMockAssignmentRepositoryResolver(mockRepo),
    );
  });

  it('should return true when all roles are assigned', async () => {
    mockRepo.countByRoleIdsAndAssignee.mockResolvedValue(2);

    const result = await handler.execute(
      new IsAssignedRolesQuery(
        ctx,
        DEFAULT_ROLE_NAMESPACE,
        ['role-1', 'role-2'],
        'user-1',
      ),
    );

    expect(mockRepo.countByRoleIdsAndAssignee).toHaveBeenCalledWith(
      ctx,
      ['role-1', 'role-2'],
      'user-1',
    );
    expect(result).toBe(true);
  });

  it('should return false when not all roles are assigned', async () => {
    mockRepo.countByRoleIdsAndAssignee.mockResolvedValue(1);

    const result = await handler.execute(
      new IsAssignedRolesQuery(
        ctx,
        DEFAULT_ROLE_NAMESPACE,
        ['role-1', 'role-2'],
        'user-1',
      ),
    );

    expect(result).toBe(false);
  });

  it('should return false when roleIds is empty', async () => {
    const result = await handler.execute(
      new IsAssignedRolesQuery(ctx, DEFAULT_ROLE_NAMESPACE, [], 'user-1'),
    );

    expect(result).toBe(false);
    expect(mockRepo.countByRoleIdsAndAssignee).not.toHaveBeenCalled();
  });
});
