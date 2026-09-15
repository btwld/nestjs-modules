import {
  createMockRoleRepository,
  createMockRoleRepositoryResolver,
  createMockRoleEntity,
  toRoleDomain,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { Role } from '../../../../domain/aggregates/role.js';
import { RoleNotFoundException } from '../../../exceptions/role-not-found.exception.js';
import { GetRoleQuery } from '../../impl/get-role.query.js';
import { GetRoleHandler } from '../get-role.handler.js';

describe(GetRoleHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleRepository>;
  let handler: GetRoleHandler;

  beforeEach(() => {
    mockRepo = createMockRoleRepository();

    handler = new GetRoleHandler(createMockRoleRepositoryResolver(mockRepo));
  });

  it('should return a Role when found', async () => {
    const existing = toRoleDomain(createMockRoleEntity());
    mockRepo.get.mockResolvedValue(existing);

    const result = await handler.execute(
      new GetRoleQuery(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id'),
    );

    expect(result).toBeInstanceOf(Role);
    expect(result.toPlain()).toEqual({
      id: 'test-role-id',
      name: 'Test Role',
      description: 'A test role',
      dateCreated: new Date('2026-01-01'),
      dateUpdated: new Date('2026-01-01'),
      dateDeleted: null,
      version: 1,
    });
  });

  it('should throw RoleNotFoundException when not found', async () => {
    mockRepo.get.mockResolvedValue(null);

    await expect(
      handler.execute(
        new GetRoleQuery(ctx, DEFAULT_ROLE_NAMESPACE, 'missing-id'),
      ),
    ).rejects.toThrow(RoleNotFoundException);
  });
});
