import { AppContextHost } from '@concepta/nestjs-core';

import {
  createMockRoleRepository,
  createMockRoleRepositoryResolver,
  createMockTransaction,
  createMockRoleEntity,
  toRoleDomain,
  DEFAULT_ROLE_NAMESPACE,
} from '../../../../__tests__/helpers/mock.helpers.js';
import { RoleNotFoundException } from '../../../exceptions/role-not-found.exception.js';
import { RemoveRoleCommand } from '../../impl/remove-role.command.js';
import { RemoveRoleHandler } from '../remove-role.handler.js';

describe(RemoveRoleHandler.name, () => {
  const ctx = {};
  let mockRepo: ReturnType<typeof createMockRoleRepository>;
  let handler: RemoveRoleHandler;

  beforeEach(() => {
    mockRepo = createMockRoleRepository();
    const { transaction } = createMockTransaction();

    handler = new RemoveRoleHandler(
      createMockRoleRepositoryResolver(mockRepo),
      transaction as never,
    );
  });

  it('should remove the role', async () => {
    const existing = toRoleDomain(createMockRoleEntity());
    mockRepo.get.mockResolvedValue(existing);

    await handler.execute(
      new RemoveRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'test-role-id'),
    );

    expect(mockRepo.remove).toHaveBeenCalledTimes(1);
    expect(mockRepo.remove).toHaveBeenCalledWith(
      expect.any(AppContextHost),
      existing,
    );
  });

  it('should throw RoleNotFoundException when role does not exist', async () => {
    mockRepo.get.mockResolvedValue(null);

    await expect(
      handler.execute(
        new RemoveRoleCommand(ctx, DEFAULT_ROLE_NAMESPACE, 'missing-id'),
      ),
    ).rejects.toThrow(RoleNotFoundException);
  });
});
