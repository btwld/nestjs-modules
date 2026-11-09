import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Otp } from '../../../domain/aggregates/otp.js';
import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { FindActiveOtpQuery } from '../impl/find-active-otp.query.js';

@QueryHandler(FindActiveOtpQuery)
export class FindActiveOtpHandler implements IQueryHandler<FindActiveOtpQuery> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
  ) {}

  async execute(query: FindActiveOtpQuery): Promise<Otp | null> {
    const { ctx, namespace, otp } = query;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    return otpRepo.findActiveByPasscode(ctx, {
      category: otp.category,
      passcode: otp.passcode,
    });
  }
}
