import EventEmitter2 from 'eventemitter2';

import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  Logger,
  type ModuleMetadata,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import { eventSettingsConfig } from './config/event-settings.config';
import {
  EVENT_MODULE_EMITTER_SERVICE_TOKEN,
  EVENT_MODULE_SETTINGS_TOKEN,
} from './event-constants';
import { EventManager } from './event-manager';
import { type EventOptionsExtrasInterface } from './interfaces/event-options-extras.interface';
import { type EventOptionsInterface } from './interfaces/event-options.interface';
import { type EventSettingsInterface } from './interfaces/event-settings.interface';
import { EventDispatchService } from './services/event-dispatch.service';
import { EventListenService } from './services/event-listen.service';

const RAW_OPTIONS_TOKEN = Symbol('__EVENT_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: EventModuleClass,
  OPTIONS_TYPE: EVENT_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: EVENT_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<EventOptionsInterface>({
  moduleName: 'Event',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setClassMethodName('forRoot')
  .setExtras<EventOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type EventOptions = Omit<typeof EVENT_OPTIONS_TYPE, 'global'>;

export type EventAsyncOptions = Omit<typeof EVENT_ASYNC_OPTIONS_TYPE, 'global'>;

function definitionTransform(
  definition: DynamicModule,
  extras: EventOptionsExtrasInterface,
): DynamicModule {
  const { providers } = definition;
  const { global } = extras;

  return {
    ...definition,
    global,
    imports: createEventImports(),
    providers: createEventProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createEventExports()],
  };
}

export function createEventImports(): DynamicModule['imports'] {
  return [ConfigModule.forFeature(eventSettingsConfig)];
}

export function createEventExports(): Required<
  Pick<ModuleMetadata, 'exports'>
>['exports'] {
  return [
    EVENT_MODULE_SETTINGS_TOKEN,
    EVENT_MODULE_EMITTER_SERVICE_TOKEN,
    EventManager,
    EventListenService,
    EventDispatchService,
  ];
}

export function createEventProviders(options: {
  overrides?: EventOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    Logger,
    EventListenService,
    EventDispatchService,
    createEventSettingsProvider(options.overrides),
    createEventEmitterServiceProvider(),
    createEventManagerProvider(),
  ];
}

export function createEventSettingsProvider(
  optionsOverrides?: EventOptions,
): Provider {
  return createSettingsProvider<EventSettingsInterface, EventOptionsInterface>({
    settingsToken: EVENT_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: eventSettingsConfig.KEY,
    optionsOverrides,
  });
}

export function createEventEmitterServiceProvider(): Provider {
  return {
    provide: EVENT_MODULE_EMITTER_SERVICE_TOKEN,
    inject: [EVENT_MODULE_SETTINGS_TOKEN],
    useFactory: async (settings: EventSettingsInterface) => {
      return new EventEmitter2(settings?.emitter);
    },
  };
}

export function createEventManagerProvider(): Provider {
  return {
    provide: EventManager,
    inject: [EventDispatchService, EventListenService],
    useFactory: async (
      eventDispatchService: EventDispatchService,
      eventListenService: EventListenService,
    ): Promise<EventManager> => {
      EventManager.initialize(eventDispatchService, eventListenService);
      return EventManager.getInstance();
    },
  };
}
