import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { Otp } from '../../../domain/aggregates/otp.js';
import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { OtpNotFoundException } from '../../exceptions/otp-not-found.exception.js';
import { GetOtpQuery } from '../impl/get-otp.query.js';

@QueryHandler(GetOtpQuery)
export class GetOtpHandler implements IQueryHandler<GetOtpQuery> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
  ) {}

  async execute(query: GetOtpQuery): Promise<Otp> {
    const { ctx, namespace, id } = query;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    const otp = await otpRepo.get(ctx, id);

    if (!otp) {
      throw new OtpNotFoundException({ id });
    }

    return otp;
  }
}
