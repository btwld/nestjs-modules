import { DynamicModule, Module } from '@nestjs/common';

import {
  LoggerAsyncOptions,
  LoggerModuleClass,
  LoggerOptions,
} from './logger.module-definition';

/**
 * Logger Module imports all configuration needed for logger and sentry
 * With classes for request interceptor and Exceptions filters
 * where will automatically log for any request or unhandled exceptions.
 *
 * @example
 * ```ts
 * // app.module.ts
 * @Module({
 *   imports: [
 *     LoggerModule.forRoot({logLevel: ['log', 'error']})
 *   ]
 * })
 * export class AppModule {}
 *
 * // main.ts
 * async function bootstrap() {
 *   // create the app
 *   const app = await NestFactory.create(AppModule);
 *
 *   // custom logger
 *   const customLoggerService = app.get(LoggerService);
 *   customLoggerService.addTransport(app.get(LoggerSentryTransport));
 *
 *   // inform app of the custom logger
 *   app.useLogger(customLoggerService);
 * }
 *
 * // test.class.ts
 * @Injectable()
 * class TestClass {
 *   // Inject Logger Service
 *   constructor(@Inject(LoggerService) private loggerService: LoggerService) {}
 *
 *   doSomething() {
 *     this.loggerService.log('Did something');
 *   }
 * }
 *
 * // my.util.ts
 * function myHelper() {
 *   const logger = new Logger(); // <-- using the global logger
 *   logger.log('My helper ran'); // <-- LoggerService.log will be called
 * }
 * ```
 */
@Module({})
export class LoggerModule extends LoggerModuleClass {
  static register(options: LoggerOptions): DynamicModule {
    return super.register(options);
  }

  static registerAsync(options: LoggerAsyncOptions): DynamicModule {
    return super.registerAsync(options);
  }

  static forRoot(options: LoggerOptions): DynamicModule {
    return super.register({ ...options, global: true });
  }

  static forRootAsync(options: LoggerAsyncOptions): DynamicModule {
    return super.registerAsync({ ...options, global: true });
  }
}
