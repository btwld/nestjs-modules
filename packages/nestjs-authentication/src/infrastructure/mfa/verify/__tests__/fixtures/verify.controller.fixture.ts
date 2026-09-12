import {
  Body,
  Controller,
  Patch,
  PlainLiteralObject,
  Post,
  StandardSchemaValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Ctx } from '@concepta/nestjs-core';

import { VerifyConfirmParamsInterface } from '../../../../../application/services/verify/interfaces/verify-confirm-params.interface.js';
import { VerifySendParamsInterface } from '../../../../../application/services/verify/interfaces/verify-send-params.interface.js';
import { VerifyService } from '../../../../../application/services/verify/verify.service.js';
import { AuthPublic } from '../../../../decorators/auth-public.decorator.js';
import { verifyUpdateSchema } from '../../schemas/verify-update.schema.js';
import { verifySchema } from '../../schemas/verify.schema.js';

@Controller('auth/verify')
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class VerifyControllerFixture {
  constructor(private readonly verifyService: VerifyService) {}

  @ApiOperation({
    summary:
      'Send Verify account email by providing an email that will receive link to confirm account.',
  })
  @ApiOkResponse()
  @Post('/send')
  async send(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: verifySchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    verifyParams: VerifySendParamsInterface,
  ): Promise<void> {
    await this.verifyService.send(ctx, { email: verifyParams.email });
  }

  @ApiOperation({
    summary: 'confirm email providing passcode.',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @Patch('/confirm')
  async confirm(
    @Ctx() ctx: PlainLiteralObject,
    @Body({
      schema: verifyUpdateSchema,
      pipes: [new StandardSchemaValidationPipe()],
    })
    verifyUpdateParams: VerifyConfirmParamsInterface,
  ): Promise<void> {
    const { passcode } = verifyUpdateParams;

    await this.verifyService.confirmUser(ctx, { passcode });
  }
}
