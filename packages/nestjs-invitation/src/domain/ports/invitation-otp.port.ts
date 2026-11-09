import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import { AssigneeRelationInterface, ReferenceId } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { InvitationOtpPolicy } from '../policies/invitation-otp.policy.js';

export interface InvitationOtpCreatableInterface {
  category: string;
  type: string;
  assigneeId: ReferenceId;
  expiresIn: string;
  rateSeconds?: number;
  rateThreshold?: number;
}

export interface InvitationOtpInterface {
  category: string;
  type: string;
  passcode: string;
  expirationDate: Date;
  active: boolean;
  assigneeId: ReferenceId;
}

export interface CreateOtpCommandInterface {
  ctx: PlainLiteralObject;
  namespace: string;
  dto: InvitationOtpCreatableInterface;
}

export interface ConsumeOtpCommandInterface {
  ctx: PlainLiteralObject;
  namespace: string;
  otp: Pick<InvitationOtpInterface, 'category' | 'passcode'>;
}

export interface ClearOtpsCommandInterface {
  ctx: PlainLiteralObject;
  namespace: string;
  otp: Pick<InvitationOtpInterface, 'assigneeId' | 'category'>;
}

export interface ValidateOtpQueryInterface {
  ctx: PlainLiteralObject;
  namespace: string;
  otp: Pick<InvitationOtpInterface, 'category' | 'passcode'>;
}

export interface InvitationOtpPortSettings {
  createCommand: Type<CreateOtpCommandInterface>;
  consumeCommand: Type<ConsumeOtpCommandInterface>;
  clearCommand: Type<ClearOtpsCommandInterface>;
  validateQuery: Type<ValidateOtpQueryInterface>;
}

@Injectable()
export class InvitationOtpPort {
  constructor(
    private readonly portSettings: InvitationOtpPortSettings,
    private readonly policy: InvitationOtpPolicy,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly txScope: TransactionScope,
  ) {}

  async create(
    ctx: PlainLiteralObject,
    category: string,
    assigneeId: ReferenceId,
  ): Promise<InvitationOtpInterface> {
    return this.txScope.run(ctx, async (txCtx) => {
      const { type, expiresIn, namespace, rateSeconds, rateThreshold } =
        this.policy;

      const dto: InvitationOtpCreatableInterface = {
        category,
        type,
        assigneeId,
        expiresIn,
      };

      if (this.policy.clearOtpOnCreate) {
        await this.clear(txCtx, category, assigneeId);
      }

      return this.commandBus.execute(
        new this.portSettings.createCommand(txCtx, namespace, dto, {
          rateSeconds,
          rateThreshold,
        }),
      );
    });
  }

  async consume(
    ctx: PlainLiteralObject,
    category: string,
    passcode: string,
  ): Promise<AssigneeRelationInterface | null> {
    const { namespace } = this.policy;
    return this.commandBus.execute(
      new this.portSettings.consumeCommand(ctx, namespace, {
        category,
        passcode,
      }),
    );
  }

  async clear(
    ctx: PlainLiteralObject,
    category: string,
    assigneeId: ReferenceId,
  ): Promise<void> {
    const { namespace } = this.policy;
    return this.commandBus.execute(
      new this.portSettings.clearCommand(ctx, namespace, {
        assigneeId,
        category,
      }),
    );
  }

  async validate(
    ctx: PlainLiteralObject,
    category: string,
    passcode: string,
  ): Promise<AssigneeRelationInterface | null> {
    const { namespace } = this.policy;
    return this.queryBus.execute(
      new this.portSettings.validateQuery(ctx, namespace, {
        category,
        passcode,
      }),
    );
  }
}
