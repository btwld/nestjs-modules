import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { User } from '../../../domain/aggregates/user.js';
import { UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { GetUserByEmailQuery } from '../impl/get-user-by-email.query.js';

@QueryHandler(GetUserByEmailQuery)
export class GetUserByEmailHandler implements IQueryHandler<GetUserByEmailQuery> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  async execute(query: GetUserByEmailQuery): Promise<User | null> {
    const { ctx, email } = query;
    return this.userRepository.findByEmail(ctx, email);
  }
}
