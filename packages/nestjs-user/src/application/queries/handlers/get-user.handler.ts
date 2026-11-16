import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { User } from '../../../domain/aggregates/user.js';
import { UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { GetUserQuery } from '../impl/get-user.query.js';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  async execute(query: GetUserQuery): Promise<User | null> {
    const { ctx, id } = query;

    return this.userRepository.get(ctx, id);
  }
}
