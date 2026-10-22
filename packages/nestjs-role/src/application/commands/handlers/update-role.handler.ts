import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { Role } from '../../../domain/aggregates/role.js';
import { RoleRepositoryResolverInterface } from '../../../domain/repositories/role-repository-resolver.interface.js';
import { ROLE_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { RoleNotFoundException } from '../../exceptions/role-not-found.exception.js';
import { UpdateRoleCommand } from '../impl/update-role.command.js';

@CommandHandler(UpdateRoleCommand)
export class UpdateRoleHandler implements ICommandHandler<UpdateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: UpdateRoleCommand): Promise<Role> {
    const { ctx, namespace, id, dto } = command;
    const roleRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const existing = await roleRepo.get(txCtx, id);

      if (!existing) {
        throw new RoleNotFoundException({ id: String(id) });
      }

      const role = this.eventPublisher.mergeObjectContext(existing);

      role.update(eventContext, dto);

      await roleRepo.save(txCtx, role);

      txCtx.trx.onCommit(() => role.commit());
      txCtx.trx.onRollback(() => role.uncommit());

      return role;
    });
  }
}
