import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  PlainLiteralObject,
  Post,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Ctx } from '@concepta/nestjs-core';

import { RecoveryRecoverLoginParamsInterface } from '../../../../../application/services/recovery/interfaces/recovery-recover-login-params.interface.js';
import { RecoveryRecoverPasswordParamsInterface } from '../../../../../application/services/recovery/interfaces/recovery-recover-password-params.interface.js';
import { RecoveryUpdatePasswordParamsInterface } from '../../../../../application/services/recovery/interfaces/recovery-update-password-params.interface.js';
import { RecoveryService } from '../../../../../application/services/recovery/recovery.service.js';
import { AuthPublic } from '../../../../decorators/auth-public.decorator.js';
import { RecoveryOtpInvalidException } from '../../exceptions/recovery-otp-invalid.exception.js';
import { recoveryRecoverLoginSchema } from '../../schemas/recovery-recover-login.schema.js';
import { recoveryRecoverPasswordSchema } from '../../schemas/recovery-recover-password.schema.js';
import { recoveryUpdatePasswordSchema } from '../../schemas/recovery-update-password.schema.js';

@Controller('auth/recovery')
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class RecoveryController {
  constructor(
    @Inject(RecoveryService)
    private readonly recoveryService: RecoveryService,
  ) {}

  @ApiOperation({
    summary:
      'Recover account username password by providing an email that will receive an username.',
  })
  @ApiOkResponse()
  @Post('/login')
  async recoverLogin(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: recoveryRecoverLoginSchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    recoverLoginParams: RecoveryRecoverLoginParamsInterface,
  ): Promise<void> {
    await this.recoveryService.recoverLogin(ctx, recoverLoginParams.email);
  }

  @ApiOperation({
    summary:
      'Recover account email password by providing an email that will receive a password reset link.',
  })
  @ApiOkResponse()
  @Post('/password')
  async recoverPassword(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: recoveryRecoverPasswordSchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    recoverPasswordParams: RecoveryRecoverPasswordParamsInterface,
  ): Promise<void> {
    await this.recoveryService.recoverPassword(
      ctx,
      recoverPasswordParams.email,
    );
  }

  @ApiOperation({
    summary: 'Check if passcode is valid.',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @Get('/passcode/:passcode')
  async validatePasscode(
    @Ctx() ctx: PlainLiteralObject,
    @Param('passcode') passcode: string,
  ): Promise<void> {
    const otp = await this.recoveryService.validatePasscode(ctx, passcode);

    if (!otp) {
      throw new RecoveryOtpInvalidException();
    }
  }

  @ApiOperation({
    summary: 'Update lost password by providing passcode and new password.',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @Patch('/password')
  async updatePassword(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: recoveryUpdatePasswordSchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    updatePasswordParams: RecoveryUpdatePasswordParamsInterface,
  ): Promise<void> {
    const { passcode, newPassword } = updatePasswordParams;

    const user = await this.recoveryService.updatePassword(
      ctx,
      passcode,
      newPassword,
    );

    if (!user) {
      // the client should have checked using validate passcode first
      throw new RecoveryOtpInvalidException();
    }
  }
}
