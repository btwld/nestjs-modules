import { Inject, Injectable, PlainLiteralObject } from '@nestjs/common';
import { EventPublisher } from '@nestjs/cqrs';

import {
  EventContextHost,
  ReferenceId,
  ReferenceIdInterface,
} from '@concepta/nestjs-core';
import {
  isPasswordStorage,
  PasswordStorageInterface,
} from '@concepta/nestjs-password';
import { TransactionScope } from '@concepta/nestjs-repository';

import { USER_CREDENTIALS_REPOSITORY_TOKEN } from '../../user.constants.js';
import { UserCredentials } from '../aggregates/user-credentials.js';
import { UserCredentialsCollection } from '../collections/user-credentials.collection.js';
import { UserCredentialsAlreadyExistException } from '../exceptions/user-credentials-already-exist.exception.js';
import { UserPasswordCurrentInvalidException } from '../exceptions/user-password-current-invalid.exception.js';
import { UserPasswordPolicy } from '../policies/user-password.policy.js';
import { UserPasswordPort } from '../ports/user-password.port.js';
import { UserCredentialsRepositoryInterface } from '../repositories/user-credentials-repository.interface.js';

@Injectable()
export class UserCredentialsService {
  constructor(
    @Inject(USER_CREDENTIALS_REPOSITORY_TOKEN)
    private readonly userCredentialsRepository: UserCredentialsRepositoryInterface,
    private readonly txScope: TransactionScope,
    private readonly eventPublisher: EventPublisher,
    private readonly passwordPort: UserPasswordPort,
    private readonly passwordPolicy: UserPasswordPolicy,
  ) {}

  async setPassword(
    ctx: PlainLiteralObject,
    eventContext: EventContextHost,
    userId: ReferenceId,
    password: string | PasswordStorageInterface,
  ): Promise<UserCredentials> {
    return this.txScope.run(ctx, async (txCtx) => {
      const existing = await this.userCredentialsRepository.findActiveByUserId(
        txCtx,
        userId,
      );

      if (existing) {
        throw new UserCredentialsAlreadyExistException();
      }

      const passwordStorage = isPasswordStorage(password)
        ? password
        : await this.passwordPort.create(password);

      return this.createCredentials(
        txCtx,
        eventContext,
        userId,
        passwordStorage,
      );
    });
  }

  async updatePassword(
    ctx: PlainLiteralObject,
    eventContext: EventContextHost,
    userId: ReferenceId,
    password: string,
    passwordCurrent?: string,
  ): Promise<void> {
    await this.txScope.run(ctx, async (txCtx) => {
      // fetch active credentials
      const activeCredentials =
        await this.userCredentialsRepository.findActiveByUserId(txCtx, userId);

      // validate current password if required by policy
      if (this.passwordPolicy.requireCurrent) {
        if (!activeCredentials || !passwordCurrent) {
          throw new UserPasswordCurrentInvalidException();
        }

        await this.validateCurrentPassword(activeCredentials, passwordCurrent);
      }

      // validate against history
      await this.validateHistory(txCtx, userId, password);

      // hash
      const passwordStorage = await this.passwordPort.create(password);

      if (activeCredentials) {
        await this.deactivateCredentials(
          txCtx,
          eventContext,
          activeCredentials,
        );
      }

      await this.createCredentials(
        txCtx,
        eventContext,
        userId,
        passwordStorage,
      );
    });
  }

  protected async createCredentials(
    ctx: PlainLiteralObject,
    eventContext: EventContextHost,
    userId: ReferenceId,
    passwordStorage: PasswordStorageInterface,
  ): Promise<UserCredentials> {
    return this.txScope.run(ctx, async (txCtx) => {
      const credentials = UserCredentials.create(eventContext, {
        userId,
        passwordHash: passwordStorage.passwordHash,
      });

      const merged = this.eventPublisher.mergeObjectContext(credentials);
      await this.userCredentialsRepository.save(txCtx, merged);
      txCtx.trx.onCommit(() => merged.commit());
      txCtx.trx.onRollback(() => merged.uncommit());

      return merged;
    });
  }

  protected async deactivateCredentials(
    ctx: PlainLiteralObject,
    eventContext: EventContextHost,
    credentials: UserCredentials,
  ): Promise<void> {
    return this.txScope.run(ctx, async (txCtx) => {
      const merged = this.eventPublisher.mergeObjectContext(credentials);
      merged.deactivate(eventContext);
      await this.userCredentialsRepository.save(txCtx, merged);
      txCtx.trx.onCommit(() => merged.commit());
      txCtx.trx.onRollback(() => merged.uncommit());
    });
  }

  protected async validateCurrentPassword(
    target: ReferenceIdInterface & PasswordStorageInterface,
    passwordCurrent: string,
  ): Promise<void> {
    const currentIsValid = await this.passwordPort.validateCurrent(
      passwordCurrent,
      target,
    );

    if (!currentIsValid) {
      throw new UserPasswordCurrentInvalidException();
    }
  }

  protected async validateHistory(
    ctx: PlainLiteralObject,
    userId: ReferenceId,
    password: string,
  ): Promise<void> {
    if (!this.passwordPolicy.reuseRestricted) return;

    const history = await this.userCredentialsRepository.findByUserId(
      ctx,
      userId,
      this.passwordPolicy.reuseLimitDate,
    );

    const collection = new UserCredentialsCollection(
      history,
      this.passwordPort,
    );

    await collection.notReused(password);
  }
}
