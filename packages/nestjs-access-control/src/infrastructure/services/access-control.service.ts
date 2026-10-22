import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AccessControlServiceInterface } from '../../domain/ports/access-control-service.interface.js';

interface RoleDefaultInterface {
  name: string;
}

interface UserDefaultInterface {
  userRoles: { role: RoleDefaultInterface }[];
}

@Injectable()
export class AccessControlService implements AccessControlServiceInterface {
  async getUser<T>(context: ExecutionContext): Promise<T> {
    const request = context.switchToHttp().getRequest();
    return request.user as T;
  }
  async getUserRoles(context: ExecutionContext): Promise<string | string[]> {
    const user = await this.getUser<UserDefaultInterface>(context);
    if (!user || !user.userRoles) throw new UnauthorizedException();
    return user.userRoles.map((userRole) => userRole.role.name);
  }
}
