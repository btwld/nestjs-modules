import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';

import { AssignRoleHandler } from './application/commands/handlers/assign-role.handler.js';
import { AssignRolesHandler } from './application/commands/handlers/assign-roles.handler.js';
import { CreateRoleHandler } from './application/commands/handlers/create-role.handler.js';
import { RemoveRoleHandler } from './application/commands/handlers/remove-role.handler.js';
import { ReplaceRoleHandler } from './application/commands/handlers/replace-role.handler.js';
import { RevokeRoleHandler } from './application/commands/handlers/revoke-role.handler.js';
import { RevokeRolesHandler } from './application/commands/handlers/revoke-roles.handler.js';
import { UpdateRoleHandler } from './application/commands/handlers/update-role.handler.js';
import { GetAssignedRolesHandler } from './application/queries/handlers/get-assigned-roles.handler.js';
import { GetRoleAssignmentHandler } from './application/queries/handlers/get-role-assignment.handler.js';
import { GetRoleHandler } from './application/queries/handlers/get-role.handler.js';
import { IsAssignedRoleHandler } from './application/queries/handlers/is-assigned-role.handler.js';
import { IsAssignedRolesHandler } from './application/queries/handlers/is-assigned-roles.handler.js';
import { RoleContextOverlay } from './gateways/role-context.overlay.js';
import { type RoleExtrasInterface } from './infrastructure/config/interfaces/role-extras.interface.js';
import { type RoleOptionsInterface } from './infrastructure/config/interfaces/role-options.interface.js';
import { RoleAssignmentRepositoryResolver } from './infrastructure/persistence/role-assignment-repository.resolver.js';
import { RoleAssignmentMapper } from './infrastructure/persistence/role-assignment.mapper.js';
import { RoleRepositoryResolver } from './infrastructure/persistence/role-repository.resolver.js';
import { RoleMapper } from './infrastructure/persistence/role.mapper.js';
import {
  ROLE_ASSIGNMENT_CUSTOM_REPOSITORY_TOKEN,
  ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN,
  ROLE_CUSTOM_REPOSITORY_TOKEN,
  ROLE_REPOSITORY_RESOLVER_TOKEN,
} from './role.constants.js';

const RAW_OPTIONS_TOKEN = Symbol('__ROLE_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: RoleCoreModuleClass,
  OPTIONS_TYPE: ROLE_CORE_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: ROLE_CORE_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<RoleOptionsInterface>({
  moduleName: 'RoleCore',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<RoleExtrasInterface>({ global: true }, definitionTransform)
  .build();

export type RoleCoreOptions = typeof ROLE_CORE_OPTIONS_TYPE;
export type RoleCoreAsyncOptions = typeof ROLE_CORE_ASYNC_OPTIONS_TYPE;

function definitionTransform(
  definition: DynamicModule,
  { global, providers: overrideProviders, repositories }: RoleExtrasInterface,
): DynamicModule {
  const { providers = [], imports = [] } = definition;

  return {
    ...definition,
    global,
    imports: createRoleImports({ imports }),
    providers: createRoleProviders({
      providers: [...providers, ...(overrideProviders ?? [])],
      repositories,
    }),
    exports: [RAW_OPTIONS_TOKEN, ...createRoleExports()],
  };
}

export function createRoleImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [...(options.imports || []), CqrsModule.forRoot()];
}

export function createRoleProviders(options: {
  providers?: Provider[];
  repositories?: RoleExtrasInterface['repositories'];
}): Provider[] {
  return [
    RoleMapper,
    RoleAssignmentMapper,
    {
      provide: ROLE_CUSTOM_REPOSITORY_TOKEN,
      useValue: options.repositories?.role ?? null,
    },
    {
      provide: ROLE_ASSIGNMENT_CUSTOM_REPOSITORY_TOKEN,
      useValue: options.repositories?.roleAssignment ?? null,
    },
    {
      provide: ROLE_REPOSITORY_RESOLVER_TOKEN,
      useClass: RoleRepositoryResolver,
    },
    {
      provide: ROLE_ASSIGNMENT_REPOSITORY_RESOLVER_TOKEN,
      useClass: RoleAssignmentRepositoryResolver,
    },
    // Command handlers
    CreateRoleHandler,
    UpdateRoleHandler,
    ReplaceRoleHandler,
    RemoveRoleHandler,
    AssignRoleHandler,
    AssignRolesHandler,
    RevokeRoleHandler,
    RevokeRolesHandler,
    // Query handlers
    GetRoleHandler,
    GetRoleAssignmentHandler,
    GetAssignedRolesHandler,
    IsAssignedRoleHandler,
    IsAssignedRolesHandler,
    { provide: APP_INTERCEPTOR, useClass: RoleContextOverlay },
    ...(options.providers ?? []),
  ];
}

export function createRoleExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [RoleMapper, RoleAssignmentMapper];
}
