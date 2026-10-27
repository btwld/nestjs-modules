import { Injectable, PlainLiteralObject, Type } from '@nestjs/common';
import { Command, CommandBus, Query, QueryBus } from '@nestjs/cqrs';

import { AssigneeRelationInterface, ReferenceId } from '@concepta/nestjs-core';

export interface AuthenticationOtpCreatableInterface {
  category: string;
  type: string;
  assigneeId: ReferenceId;
  expiresIn: string;
  rateSeconds?: number;
  rateThreshold?: number;
}

export interface AuthenticationOtpInterface {
  category: string;
  type: string;
  passcode: string;
  expirationDate: Date;
  active: boolean;
  assigneeId: ReferenceId;
}

export interface OtpCreateOptions {
  duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  rateSeconds?: number;
  rateThreshold?: number;
}

export interface CreateOtpCommandInterface extends Command<AuthenticationOtpInterface> {
  ctx: PlainLiteralObject;
  namespace: string;
  otp: AuthenticationOtpCreatableInterface;
  duplicateStrategy?: 'ALLOW' | 'DEACTIVATE';
  rateSeconds?: number;
  rateThreshold?: number;
}

export interface ValidateOtpQueryInterface extends Query<AssigneeRelationInterface | null> {
  ctx: PlainLiteralObject;
  namespace: string;
  otp: Pick<AuthenticationOtpInterface, 'category' | 'passcode'>;
}

export interface ClearOtpCommandInterface extends Command<void> {
  ctx: PlainLiteralObject;
  namespace: string;
  otp: Pick<AuthenticationOtpInterface, 'category' | 'assigneeId'>;
}

export interface OtpPortSettings {
  createCommand: Type<CreateOtpCommandInterface>;
  validateQuery: Type<ValidateOtpQueryInterface>;
  clearCommand: Type<ClearOtpCommandInterface>;
}

@Injectable()
export class OtpPort {
  constructor(
    private readonly portSettings: OtpPortSettings,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  async create(
    ctx: PlainLiteralObject,
    namespace: string,
    otp: AuthenticationOtpCreatableInterface,
    options?: OtpCreateOptions,
  ): Promise<AuthenticationOtpInterface> {
    return this.commandBus.execute(
      new this.portSettings.createCommand(ctx, namespace, otp, options),
    );
  }

  async validate(
    ctx: PlainLiteralObject,
    namespace: string,
    otp: Pick<AuthenticationOtpInterface, 'category' | 'passcode'>,
  ): Promise<AssigneeRelationInterface | null> {
    return this.queryBus.execute(
      new this.portSettings.validateQuery(ctx, namespace, otp),
    );
  }

  async clear(
    ctx: PlainLiteralObject,
    namespace: string,
    otp: Pick<AuthenticationOtpInterface, 'category' | 'assigneeId'>,
  ): Promise<void> {
    return this.commandBus.execute(
      new this.portSettings.clearCommand(ctx, namespace, otp),
    );
  }
}
