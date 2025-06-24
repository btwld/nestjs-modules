import { AuthGuardInterface } from '@concepta/nestjs-authentication';
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class OAuthFixtureGuard implements AuthGuardInterface, CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean {
    const request = context.switchToHttp().getRequest();

    // Attach a mock user to the request for testing
    request.user = {
      id: 'fixture-user-allow',
      username: 'fixture-allow', 
      email: 'fixture-allow@test.com',
      provider: 'google',
      roles: ['user'],
      isActive: true,
    };

    return true;
  }
}
