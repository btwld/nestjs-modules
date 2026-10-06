import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { Role } from '../../../domain/aggregates/role.js';
import { RoleRepositoryResolverInterface } from '../../../domain/repositories/role-repository-resolver.interface.js';
import { ROLE_REPOSITORY_RESOLVER_TOKEN } from '../../../role.constants.js';
import { CreateRoleCommand } from '../impl/create-role.command.js';

@CommandHandler(CreateRoleCommand)
export class CreateRoleHandler implements ICommandHandler<CreateRoleCommand> {
  constructor(
    @Inject(ROLE_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: RoleRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(command: CreateRoleCommand): Promise<Role> {
    const { ctx, namespace, dto } = command;
    const roleRepo = this.repositoryResolver.resolve(namespace);

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      const role = this.eventPublisher.mergeObjectContext(
        Role.create(eventContext, dto),
      );

      await roleRepo.save(txCtx, role);

      txCtx.trx.onCommit(() => role.commit());
      txCtx.trx.onRollback(() => role.uncommit());

      return role;
    });
  }
}
