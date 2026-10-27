import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { JwtService } from '../../../infrastructure/jwt/jwt.service.js';
import { SignAccessTokenCommand } from '../impl/sign-access-token.command.js';

@CommandHandler(SignAccessTokenCommand)
export class SignAccessTokenHandler implements ICommandHandler<
  SignAccessTokenCommand,
  string
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(command: SignAccessTokenCommand): Promise<string> {
    return this.jwtService.signAccessToken(command.token);
  }
}
