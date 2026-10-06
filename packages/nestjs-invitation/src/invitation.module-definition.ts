import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommandBus, CqrsModule, QueryBus } from '@nestjs/cqrs';

import { createSettingsProvider } from '@concepta/nestjs-core';
import { TransactionScope } from '@concepta/nestjs-repository';

import { AcceptInvitationHandler } from './application/commands/handlers/accept-invitation.handler.js';
import { CreateInvitationByEmailHandler } from './application/commands/handlers/create-invitation-by-email.handler.js';
import { CreateInvitationHandler } from './application/commands/handlers/create-invitation.handler.js';
import { RemoveInvitationHandler } from './application/commands/handlers/remove-invitation.handler.js';
import { RevokeInvitationsHandler } from './application/commands/handlers/revoke-invitations.handler.js';
import { SendInvitationHandler } from './application/commands/handlers/send-invitation.handler.js';
import { InvitationAcceptedListener } from './application/listeners/invitation-accepted.listener.js';
import { InvitationDispatchedListener } from './application/listeners/invitation-dispatched.listener.js';
import { InvitationRevokedListener } from './application/listeners/invitation-revoked.listener.js';
import { FindInvitationByCodeHandler } from './application/queries/handlers/find-invitation-by-code.handler.js';
import { GetInvitationHandler } from './application/queries/handlers/get-invitation.handler.js';
import { invitationDefaultConfig } from './config/invitation-default.config.js';
import { InvitationOtpPolicy } from './domain/policies/invitation-otp.policy.js';
import { InvitationNotificationPort } from './domain/ports/invitation-notification.port.js';
import { InvitationOtpPort } from './domain/ports/invitation-otp.port.js';
import { InvitationUserPort } from './domain/ports/invitation-user.port.js';
import { InvitationService } from './domain/services/invitation.service.js';
import { InvitationMapper } from './infrastructure/persistence/invitation.mapper.js';
import { createInvitationOtpPolicyProvider } from './infrastructure/utils/create-invitation-otp-policy-provider.js';
import { createInvitationRepositoryProvider } from './infrastructure/utils/create-invitation-repository-provider.js';
import { type InvitationOptionsExtrasInterface } from './interfaces/options/invitation-options-extras.interface.js';
import { type InvitationOptionsInterface } from './interfaces/options/invitation-options.interface.js';
import { type InvitationSettingsInterface } from './interfaces/options/invitation-settings.interface.js';
import {
  INVITATION_MODULE_DEFAULT_ENTITY_KEY,
  INVITATION_MODULE_SETTINGS_TOKEN,
} from './invitation.constants.js';

const RAW_OPTIONS_TOKEN = Symbol('__INVITATION_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: InvitationModuleClass,
  OPTIONS_TYPE: INVITATION_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: INVITATION_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<InvitationOptionsInterface>({
  moduleName: 'Invitation',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<InvitationOptionsExtrasInterface>(
    {
      global: false,
      entities: { invitation: INVITATION_MODULE_DEFAULT_ENTITY_KEY },
    },
    definitionTransform,
  )
  .build();

export type InvitationOptions = Omit<typeof INVITATION_OPTIONS_TYPE, 'global'>;
export type InvitationAsyncOptions = Omit<
  typeof INVITATION_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: InvitationOptionsExtrasInterface,
): DynamicModule {
  const { imports = [], providers = [] } = definition;
  const { global = false, entities, repositories } = extras;
  const entityKey =
    entities?.invitation ?? INVITATION_MODULE_DEFAULT_ENTITY_KEY;

  return {
    ...definition,
    global,
    imports: createInvitationImports({ imports }),
    providers: createInvitationProviders({
      providers,
      entityKey,
      repositories,
    }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createInvitationExports()],
  };
}

export function createInvitationImports(options: {
  imports: DynamicModule['imports'];
}): DynamicModule['imports'] {
  return [
    ...(options.imports || []),
    ConfigModule.forFeature(invitationDefaultConfig),
    CqrsModule.forRoot(),
  ];
}

export function createInvitationExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [INVITATION_MODULE_SETTINGS_TOKEN, InvitationMapper];
}

export function createInvitationProviders(options: {
  overrides?: InvitationOptions;
  providers?: Provider[];
  entityKey: string;
  repositories?: InvitationOptionsExtrasInterface['repositories'];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    InvitationService,
    createInvitationSettingsProvider(options.overrides),
    ...createInvitationRepositoryProvider(
      options.entityKey,
      options.repositories?.invitation,
    ),
    createInvitationOtpPolicyProvider(),
    createInvitationOtpPortProvider(),
    createInvitationUserPortProvider(),
    createInvitationNotificationPortProvider(),
    InvitationMapper,
    // command handlers
    CreateInvitationHandler,
    CreateInvitationByEmailHandler,
    SendInvitationHandler,
    AcceptInvitationHandler,
    RevokeInvitationsHandler,
    RemoveInvitationHandler,
    // query handlers
    GetInvitationHandler,
    FindInvitationByCodeHandler,
    // event listeners
    InvitationDispatchedListener,
    InvitationRevokedListener,
    InvitationAcceptedListener,
  ];
}

export function createInvitationSettingsProvider(
  optionsOverrides?: InvitationOptions,
): Provider {
  return createSettingsProvider<
    InvitationSettingsInterface,
    InvitationOptionsInterface
  >({
    settingsToken: INVITATION_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: invitationDefaultConfig.KEY,
    optionsOverrides,
  });
}

function createInvitationOtpPortProvider(): Provider {
  return {
    provide: InvitationOtpPort,
    inject: [
      RAW_OPTIONS_TOKEN,
      InvitationOtpPolicy,
      CommandBus,
      QueryBus,
      TransactionScope,
    ],
    useFactory: (
      options: InvitationOptionsInterface,
      otpPolicy: InvitationOtpPolicy,
      commandBus: CommandBus,
      queryBus: QueryBus,
      txScope: TransactionScope,
    ) =>
      new InvitationOtpPort(
        options.ports.otp,
        otpPolicy,
        commandBus,
        queryBus,
        txScope,
      ),
  };
}

function createInvitationUserPortProvider(): Provider {
  return {
    provide: InvitationUserPort,
    inject: [RAW_OPTIONS_TOKEN, QueryBus],
    useFactory: (options: InvitationOptionsInterface, queryBus: QueryBus) =>
      new InvitationUserPort(options.ports.user, queryBus),
  };
}

function createInvitationNotificationPortProvider(): Provider {
  return {
    provide: InvitationNotificationPort,
    inject: [RAW_OPTIONS_TOKEN, CommandBus],
    useFactory: (options: InvitationOptionsInterface, commandBus: CommandBus) =>
      new InvitationNotificationPort(options.ports.notification, commandBus),
  };
}
