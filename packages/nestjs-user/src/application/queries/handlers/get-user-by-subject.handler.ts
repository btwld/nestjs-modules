import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { User } from '../../../domain/aggregates/user.js';
import { UserRepositoryInterface } from '../../../domain/repositories/user-repository.interface.js';
import { USER_REPOSITORY_TOKEN } from '../../../user.constants.js';
import { GetUserBySubjectQuery } from '../impl/get-user-by-subject.query.js';

@QueryHandler(GetUserBySubjectQuery)
export class GetUserBySubjectHandler implements IQueryHandler<GetUserBySubjectQuery> {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: UserRepositoryInterface,
  ) {}

  async execute(query: GetUserBySubjectQuery): Promise<User | null> {
    const { ctx, subject } = query;
    return this.userRepository.get(ctx, subject);
  }
}
