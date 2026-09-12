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
import { RefreshGuard } from '../../refresh.guard.js';
import { refreshSchema } from '../../schemas/refresh.schema.js';

const refreshBodySchema = refreshSchema['~standard'].jsonSchema?.input?.({
  target: 'openapi-3.0',
});

if (!refreshBodySchema) {
  throw new Error(
    'refreshSchema is missing its OpenAPI bridge — wrap it with withOpenApi() first.',
  );
}

/**
 * Auth Local controller
 */
@Controller('token/refresh')
@UseGuards(RefreshGuard)
@AuthPublic({ classLevel: true })
@ApiTags('auth')
export class RefreshControllerFixture {
  constructor(private readonly commandBus: CommandBus) {}

  /**
   * Login
   */
  @ApiBody({
    schema: refreshBodySchema,
    description: 'Schema containing a refresh token.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    standardSchema: authenticationResponseSchema,
    description: 'Schema containing an access token and a refresh token.',
  })
  @ApiUnauthorizedResponse()
  @Post()
  async refresh(
    @AuthUser() user: AuthenticatedUserInterface,
  ): Promise<AuthenticatedResponseInterface> {
    return this.commandBus.execute(
      new IssueAuthenticatedResponseCommand({}, user.id),
    );
  }
}
