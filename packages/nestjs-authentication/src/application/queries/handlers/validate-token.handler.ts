import { Inject, Optional } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AUTHENTICATION_USER_PORT_TOKEN } from '../../../authentication.constants.js';
import { UserPort } from '../../../domain/ports/user.port.js';
import { AuthenticationUserPortRequiredException } from '../../exceptions/authentication-user-port-required.exception.js';
import { ValidateTokenQuery } from '../impl/validate-token.query.js';

@QueryHandler(ValidateTokenQuery)
export class ValidateTokenHandler implements IQueryHandler<
  ValidateTokenQuery,
  boolean
> {
  constructor(
    @Optional()
    @Inject(AUTHENTICATION_USER_PORT_TOKEN)
    private readonly userPort: UserPort | null,
  ) {}

  async execute(query: ValidateTokenQuery): Promise<boolean> {
    if (!this.userPort) {
      throw new AuthenticationUserPortRequiredException();
    }
    const { ctx, payload } = query;
    const { sub } = payload;
    const user =
      typeof sub === 'string'
        ? await this.userPort.getBySubject(ctx, sub)
        : null;
    // An inactive user is refused like a missing one.
    return user?.active === true;
  }
}
