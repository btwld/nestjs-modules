import { Inject, Injectable, PlainLiteralObject } from '@nestjs/common';

import {
  AssigneeRelationInterface,
  ReferenceIdInterface,
} from '@concepta/nestjs-core';

import {
  AUTHENTICATION_OTP_PORT_TOKEN,
  AUTHENTICATION_PASSWORD_PORT_TOKEN,
  AUTHENTICATION_RECOVERY_NOTIFICATION_PORT_TOKEN,
  AUTHENTICATION_USER_PORT_TOKEN,
} from '../../../authentication.constants.js';
import { RecoveryPolicy } from '../../../domain/policies/recovery.policy.js';
import { OtpPort } from '../../../domain/ports/otp.port.js';
import { PasswordPort } from '../../../domain/ports/password.port.js';
import { RecoveryNotificationPort } from '../../../domain/ports/recovery-notification.port.js';
import { UserPort } from '../../../domain/ports/user.port.js';

@Injectable()
export class RecoveryService {
  constructor(
    @Inject(RecoveryPolicy)
    private readonly policy: RecoveryPolicy,
    @Inject(AUTHENTICATION_OTP_PORT_TOKEN)
    private readonly otpPort: OtpPort,
    @Inject(AUTHENTICATION_USER_PORT_TOKEN)
    private readonly userPort: UserPort,
    @Inject(AUTHENTICATION_PASSWORD_PORT_TOKEN)
    private readonly passwordPort: PasswordPort,
    @Inject(AUTHENTICATION_RECOVERY_NOTIFICATION_PORT_TOKEN)
    private readonly recoveryNotificationPort: RecoveryNotificationPort,
  ) {}

  /**
   * Recover lost username providing an email and send the username by email.
   *
   * @param ctx - context object
   * @param email - user email
   */
  async recoverLogin(ctx: PlainLiteralObject, email: string): Promise<void> {
    // recover the user by providing an email
    const user = await this.userPort.getByEmail(ctx, email);

    // did we find the user?
    if (user) {
      // yes, send an email with the recovered login
      this.recoveryNotificationPort.sendRecoverLogin(ctx, email, user.username);
    }

    // !!! Falling through to void is intentional              !!!!
    // !!! Do NOT give any indication if e-mail does not exist !!!!
  }

  /**
   * Recover lost password providing an email and send the passcode token by email.
   *
   * @param ctx - context object
   * @param email - user email
   */
  async recoverPassword(ctx: PlainLiteralObject, email: string): Promise<void> {
    // recover the user by providing an email
    const user = await this.userPort.getByEmail(ctx, email);

    // did we find a user?
    if (user) {
      const {
        otpCategory: category,
        otpNamespace: namespace,
        otpType: type,
        otpExpiresIn: expiresIn,
        otpDuplicateStrategy: duplicateStrategy,
        otpRateSeconds: rateSeconds,
        otpRateThreshold: rateThreshold,
      } = this.policy;

      // create an OTP save it in the database
      const otp = await this.otpPort.create(
        ctx,
        namespace,
        {
          category,
          type,
          expiresIn,
          assigneeId: user.id,
          rateSeconds,
          rateThreshold,
        },
        { duplicateStrategy, rateSeconds, rateThreshold },
      );

      // send an email with a recover OTP
      this.recoveryNotificationPort.sendRecoverPassword(ctx, email, {
        passcode: otp.passcode,
        tokenExp: otp.expirationDate,
      });
    }

    // !!! Falling through to void is intentional              !!!!
    // !!! Do NOT give any indication if e-mail does not exist !!!!
  }

  /**
   * Validate passcode and return it's user.
   *
   * @param ctx - context
   * @param passcode - user's passcode
   */
  async validatePasscode(
    ctx: PlainLiteralObject,
    passcode: string,
  ): Promise<AssigneeRelationInterface | null> {
    const { otpCategory: category, otpNamespace: namespace } = this.policy;

    return this.otpPort.validate(ctx, namespace, { category, passcode });
  }

  /**
   * Change user's password by providing it's OTP passcode and the new password.
   *
   * @param ctx - context
   * @param passcode - OTP user's passcode
   * @param newPassword - new user password
   */
  async updatePassword(
    ctx: PlainLiteralObject,
    passcode: string,
    newPassword: string,
  ): Promise<ReferenceIdInterface | null> {
    // get otp by passcode
    const otp = await this.validatePasscode(ctx, passcode);

    // did we get an otp?
    if (otp) {
      // get user by otp assigneeId
      const user = await this.userPort.getById(ctx, otp.assigneeId);

      if (user) {
        await this.passwordPort.setPassword(ctx, newPassword, otp.assigneeId);

        this.recoveryNotificationPort.sendPasswordUpdated(ctx, user.email);

        await this.revokeAllUserPasswordRecoveries(ctx, user.email);
      }

      return user;
    }

    // otp was not found
    return null;
  }

  /**
   * Revoke all password recovery OTPs for a user.
   *
   * @param ctx - context
   * @param email - user email
   */
  async revokeAllUserPasswordRecoveries(
    ctx: PlainLiteralObject,
    email: string,
  ): Promise<void> {
    const user = await this.userPort.getByEmail(ctx, email);

    if (user) {
      const { otpCategory: category, otpNamespace: namespace } = this.policy;
      await this.otpPort.clear(ctx, namespace, {
        category,
        assigneeId: user.id,
      });
    }

    // !!! Falling through to void is intentional              !!!!
    // !!! Do NOT give any indication if e-mail does not exist !!!!
  }
}
