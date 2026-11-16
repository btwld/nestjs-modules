import { Inject } from '@nestjs/common';
import { CommandHandler, EventPublisher, ICommandHandler } from '@nestjs/cqrs';

import { createEventContext } from '@concepta/nestjs-core';
import {
  TransactionContextInterface,
  TransactionScope,
} from '@concepta/nestjs-repository';

import { Otp } from '../../../domain/aggregates/otp.js';
import { OtpLimitReachedException } from '../../../domain/exceptions/otp-limit-reached.exception.js';
import { OtpCreatableInterface } from '../../../domain/interfaces/otp-creatable.interface.js';
import { OtpPolicy } from '../../../domain/policies/otp.policy.js';
import { OtpRepositoryResolverInterface } from '../../../domain/repositories/otp-repository-resolver.interface.js';
import { OtpRepositoryInterface } from '../../../domain/repositories/otp-repository.interface.js';
import { otpCreateSchema } from '../../../infrastructure/schemas/otp-create.schema.js';
import { OTP_REPOSITORY_RESOLVER_TOKEN } from '../../../otp.constants.js';
import { validateOtpSchema } from '../../utils/validate-otp-schema.util.js';
import { CreateOtpCommand } from '../impl/create-otp.command.js';

@CommandHandler(CreateOtpCommand)
export class CreateOtpHandler implements ICommandHandler<CreateOtpCommand> {
  constructor(
    @Inject(OTP_REPOSITORY_RESOLVER_TOKEN)
    private readonly repositoryResolver: OtpRepositoryResolverInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly policy: OtpPolicy,
  ) {}

  async execute(command: CreateOtpCommand): Promise<Otp> {
    const {
      ctx,
      namespace,
      dto,
      duplicateStrategy,
      rateSeconds,
      rateThreshold,
    } = command;
    const typeService = this.policy.resolveTypeService(dto.type);

    const validatedDto = await validateOtpSchema(
      'OtpCreate',
      otpCreateSchema,
      dto,
    );
    const { assigneeId, category, type, expiresIn } = validatedDto;

    const otpRepo = this.repositoryResolver.resolve(namespace);

    const passcode = typeService.generator();

    const eventContext = createEventContext(ctx, { namespace }, {});

    return this.txScope.run(ctx, async (txCtx) => {
      await this.validateRateLimit({
        otpRepo,
        dto: validatedDto,
        ctx: txCtx,
        rateSeconds,
        rateThreshold,
      });

      const resolvedDuplicateStrategy =
        this.policy.resolveDuplicateStrategy(duplicateStrategy);

      if (resolvedDuplicateStrategy === 'DEACTIVATE') {
        const activeOtp = await otpRepo.findActiveByAssignee(txCtx, {
          assigneeId,
          category,
        });
        if (activeOtp) {
          const mergedActiveOtp =
            this.eventPublisher.mergeObjectContext(activeOtp);
          mergedActiveOtp.deactivate(eventContext);
          await otpRepo.save(txCtx, mergedActiveOtp);

          txCtx.trx.onCommit(() => mergedActiveOtp.commit());
          txCtx.trx.onRollback(() => mergedActiveOtp.uncommit());
        }
      }

      const otp = this.eventPublisher.mergeObjectContext(
        Otp.create(eventContext, {
          category,
          type,
          assigneeId,
          passcode,
          expiresIn,
        }),
      );

      await otpRepo.save(txCtx, otp);

      txCtx.trx.onCommit(() => otp.commit());
      txCtx.trx.onRollback(() => otp.uncommit());

      return otp;
    });
  }

  protected async validateRateLimit(params: {
    otpRepo: OtpRepositoryInterface;
    dto: OtpCreatableInterface;
    ctx: TransactionContextInterface;
    rateSeconds?: number;
    rateThreshold?: number;
  }): Promise<void> {
    const { otpRepo, dto, ctx, rateSeconds, rateThreshold } = params;

    const rateLimit = this.policy.resolveRateLimit({
      rateSeconds,
      rateThreshold,
    });

    if (rateLimit) {
      const cutoffDate = new Date();
      cutoffDate.setSeconds(cutoffDate.getSeconds() - rateLimit.rateSeconds);

      const recentCount = await otpRepo.countCreatedSince(ctx, {
        assigneeId: dto.assigneeId,
        category: dto.category,
        cutoffDate,
      });

      if (recentCount >= rateLimit.rateThreshold) {
        throw new OtpLimitReachedException();
      }
    }
  }
}
