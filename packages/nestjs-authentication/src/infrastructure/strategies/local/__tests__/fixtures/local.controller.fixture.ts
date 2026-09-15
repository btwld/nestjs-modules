import { Controller, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import {
  ApiBody,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { IssueAuthenticatedResponseCommand } from '../../../../../application/commands/impl/issue-authenticated-response.command.js';
import { AuthenticatedResponseInterface } from '../../../../../domain/interfaces/authenticated-response.interface.js';
import { AuthenticatedUserInterface } from '../../../../../domain/interfaces/authenticated-user.interface.js';
import { AuthPublic } from '../../../../decorators/auth-public.decorator.js';
import { AuthUser } from '../../../../decorators/auth-user.decorator.js';
import { authenticationResponseSchema } from '../../../../schemas/authentication-response.schema.js';
import { LocalGuard } from '../../local.guard.js';
import { localLoginSchema } from '../../schemas/local-login.schema.js';

const localLoginBodySchema = localLoginSchema['~standard'].jsonSchema?.input?.({
  target: 'openapi-3.0',
});

if (!localLoginBodySchema) {
  throw new Error(
    'localLoginSchema is missing its OpenAPI bridge — wrap it with withOpenApi() first.',
  );
}

/**
 * Auth Local controller
 */
@Controller('auth/login')
@UseGuards(LocalGuard)
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class LocalControllerFixture {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Login
   */
  @ApiBody({
    schema: localLoginBodySchema,
    description: 'Schema containing username and password.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    standardSchema: authenticationResponseSchema,
    description: 'Schema containing an access token and a refresh token.',
  })
  @ApiUnauthorizedResponse()
  @Post()
  async login(
    @AuthUser() user: AuthenticatedUserInterface,
  ): Promise<AuthenticatedResponseInterface> {
    return this.commandBus.execute(
      new IssueAuthenticatedResponseCommand({}, user.id),
    );
  }
}
