import { SetMetadata } from '@nestjs/common';

export const ROLE_NAMESPACE_KEY = 'ROLE_NAMESPACE';

export interface RoleNamespaceOptions {
  name: string;
}

export const RoleNamespace = (options: RoleNamespaceOptions) =>
  SetMetadata(ROLE_NAMESPACE_KEY, options);
