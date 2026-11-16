import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Otp } from '../../../domain/aggregates/otp.js';
import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { FindAssignedOtpsQuery } from '../impl/find-assigned-otps.query.js';

@QueryHandler(FindAssignedOtpsQuery)
export class FindAssignedOtpsHandler implements IQueryHandler<FindAssignedOtpsQuery> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
  ) {}

  async execute(query: FindAssignedOtpsQuery): Promise<Otp[]> {
    const { ctx, namespace, otp } = query;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    return otpRepo.findAllByAssigneeAndCategory(ctx, {
      assigneeId: otp.assigneeId,
      category: otp.category,
    });
  }
}
