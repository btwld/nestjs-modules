import {
  ConfigurableModuleBuilder,
  type DynamicModule,
  type Provider,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { createSettingsProvider } from '@concepta/nestjs-common';

import { reportDefaultConfig } from './config/report-default.config';
import { type ReportOptionsExtrasInterface } from './interfaces/report-options-extras.interface';
import { type ReportOptionsInterface } from './interfaces/report-options.interface';
import { type ReportSettingsInterface } from './interfaces/report-settings.interface';
import {
  REPORT_MODULE_SETTINGS_TOKEN,
  REPORT_STRATEGY_SERVICE_KEY,
} from './report.constants';
import { ReportModelService } from './services/report-model.service';
import { ReportStrategyService } from './services/report-strategy.service';
import { ReportService } from './services/report.service';

const RAW_OPTIONS_TOKEN = Symbol('__REPORT_MODULE_RAW_OPTIONS_TOKEN__');

export const {
  ConfigurableModuleClass: ReportModuleClass,
  OPTIONS_TYPE: REPORT_OPTIONS_TYPE,
  ASYNC_OPTIONS_TYPE: REPORT_ASYNC_OPTIONS_TYPE,
} = new ConfigurableModuleBuilder<ReportOptionsInterface>({
  moduleName: 'Report',
  optionsInjectionToken: RAW_OPTIONS_TOKEN,
})
  .setExtras<ReportOptionsExtrasInterface>(
    { global: false },
    definitionTransform,
  )
  .build();

export type ReportOptions = Omit<typeof REPORT_OPTIONS_TYPE, 'global'>;

export type ReportAsyncOptions = Omit<
  typeof REPORT_ASYNC_OPTIONS_TYPE,
  'global'
>;

function definitionTransform(
  definition: DynamicModule,
  extras: ReportOptionsExtrasInterface,
): DynamicModule {
  const { providers = [], imports = [] } = definition;
  const { global = false } = extras;

  return {
    ...definition,
    global,
    imports: createReportImports({ imports }),
    providers: createReportProviders({ providers }),
    exports: [ConfigModule, RAW_OPTIONS_TOKEN, ...createReportExports()],
  };
}

export function createReportImports(
  options: Pick<DynamicModule, 'imports'>,
): DynamicModule['imports'] {
  return [
    ...(options.imports ?? []),
    ConfigModule.forFeature(reportDefaultConfig),
  ];
}

export function createReportExports(): Required<
  Pick<DynamicModule, 'exports'>
>['exports'] {
  return [REPORT_MODULE_SETTINGS_TOKEN, ReportService];
}

export function createReportProviders(options: {
  overrides?: ReportOptions;
  providers?: Provider[];
}): Provider[] {
  return [
    ...(options.providers ?? []),
    createReportSettingsProvider(options.overrides),
    createStrategyServiceProvider(options.overrides),
    ReportModelService,
    ReportStrategyService,
    ReportService,
  ];
}

export function createReportSettingsProvider(
  optionsOverrides?: ReportOptions,
): Provider {
  return createSettingsProvider<
    ReportSettingsInterface,
    ReportOptionsInterface
  >({
    settingsToken: REPORT_MODULE_SETTINGS_TOKEN,
    optionsToken: RAW_OPTIONS_TOKEN,
    settingsKey: reportDefaultConfig.KEY,
    optionsOverrides,
  });
}

export function createStrategyServiceProvider(
  optionsOverrides?: ReportOptions,
): Provider {
  return {
    provide: REPORT_STRATEGY_SERVICE_KEY,
    inject: [RAW_OPTIONS_TOKEN, ReportStrategyService],
    useFactory: async (
      options: ReportOptionsInterface,
      reportStrategyService: ReportStrategyService,
    ) => {
      const storageServices =
        optionsOverrides?.reportGeneratorServices ??
        options.reportGeneratorServices;

      storageServices?.forEach((storageService) => {
        reportStrategyService.addStorageService(storageService);
      });

      return reportStrategyService;
    },
  };
}
