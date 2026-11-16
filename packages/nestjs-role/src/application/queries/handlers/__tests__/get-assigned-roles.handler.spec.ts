import {
  createMockRoleAssignmentRepository,
  createMockAssignmentRepositoryResolver,
  createMockRoleAssignmentEntity,
  toRoleAssignmentDomain,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { GetAssignedRolesQuery } from '../../impl/get-assigned-roles.query.js';
import { GetAssignedRolesHandler } from '../get-assigned-roles.handler.js';

describe(GetAssignedRolesHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleAssignmentRepository>;
  let handler: GetAssignedRolesHandler;

  beforeEach(() => {
    mockRepo = createMockRoleAssignmentRepository();

    handler = new GetAssignedRolesHandler(
      createMockAssignmentRepositoryResolver(mockRepo),
    );
  });

  it('should return assignments for the assignee', async () => {
    const assignment1 = toRoleAssignmentDomain(
      createMockRoleAssignmentEntity({ id: 'a1', roleId: 'role-1' }),
    );
    const assignment2 = toRoleAssignmentDomain(
      createMockRoleAssignmentEntity({ id: 'a2', roleId: 'role-2' }),
    );
    mockRepo.findByAssignee.mockResolvedValue([assignment1, assignment2]);

    const result = await handler.execute(
      new GetAssignedRolesQuery(ctx, DEFAULT_ROLE_NAMESPACE, 'user-1'),
    );

    expect(mockRepo.findByAssignee).toHaveBeenCalledWith(ctx, 'user-1');
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(assignment1);
    expect(result[1]).toBe(assignment2);
  });

  it('should return empty array when no assignments', async () => {
    mockRepo.findByAssignee.mockResolvedValue([]);

    const result = await handler.execute(
      new GetAssignedRolesQuery(ctx, DEFAULT_ROLE_NAMESPACE, 'user-1'),
    );

    expect(result).toEqual([]);
  });
});
