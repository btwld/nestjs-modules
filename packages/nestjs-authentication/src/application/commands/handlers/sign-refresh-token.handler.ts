import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { JwtService } from '../../../infrastructure/jwt/jwt.service.js';
import { SignRefreshTokenCommand } from '../impl/sign-refresh-token.command.js';

@CommandHandler(SignRefreshTokenCommand)
export class SignRefreshTokenHandler implements ICommandHandler<
  SignRefreshTokenCommand,
  string
> {
  constructor(private readonly jwtService: JwtService) {}

  async execute(command: SignRefreshTokenCommand): Promise<string> {
    return this.jwtService.signRefreshToken(command.token);
  }
}
