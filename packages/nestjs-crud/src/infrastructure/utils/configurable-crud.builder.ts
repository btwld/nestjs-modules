import {
  applyDecorators,
  Inject,
  PlainLiteralObject,
  Provider,
  Type,
} from '@nestjs/common';

import { DeepPartial, Operation, Ctx } from '@concepta/nestjs-core';
import {
  Transactional,
  TransactionalOptions,
} from '@concepta/nestjs-repository';

import { ConfigurableCrudOptionsTransformer } from '../../crud.types.js';
import { CrudAdapter } from '../adapters/crud.adapter.js';
import { CrudController } from '../decorators/controller/crud-controller.decorator.js';
import { CrudInit } from '../decorators/controller/crud-init.decorator.js';
import { CrudCreateBatch } from '../decorators/operations/crud-create-batch.decorator.js';
import { CrudCreate } from '../decorators/operations/crud-create.decorator.js';
import { CrudDelete } from '../decorators/operations/crud-delete.decorator.js';
import { CrudList } from '../decorators/operations/crud-list.decorator.js';
import { CrudRead } from '../decorators/operations/crud-read.decorator.js';
import { CrudReplace } from '../decorators/operations/crud-replace.decorator.js';
import { CrudRestore } from '../decorators/operations/crud-restore.decorator.js';
import { CrudSoftDelete } from '../decorators/operations/crud-soft-delete.decorator.js';
import { CrudUpdate } from '../decorators/operations/crud-update.decorator.js';
import { CrudBody } from '../decorators/params/crud-body.decorator.js';
import { CrudCommandHandler } from '../decorators/routes/crud-command-handler.decorator.js';
import { CrudQueryHandler } from '../decorators/routes/crud-query-handler.decorator.js';
import { CrudDecoratorException } from '../exceptions/crud-decorator.exception.js';
import { CrudCtx } from '../interceptors/crud-context.overlay.js';
import { CrudContextInterface } from '../interceptors/interfaces/crud-context.interface.js';
import {
  CrudControllerClassOptionsInterface,
  CrudControllerOptionsInterface,
} from '../interfaces/crud-controller-options.interface.js';
import { CrudCreateBatchInterface } from '../interfaces/crud-create-batch.interface.js';
import {
  CrudRouteCommandOptionsInterface,
  CrudRouteQueryOptionsInterface,
} from '../interfaces/crud-route-ctlr-options.interface.js';
import { CrudAdapterResolver } from '../resolvers/crud-adapter.resolver.js';
import { CrudResolverInterface } from '../resolvers/interfaces/crud-resolver.interface.js';
import { CrudMetaview } from '../services/crud-metaview.service.js';

import { createCrudAdapterProvider } from './create-crud-adapter-provider.js';
import {
  isBodyOperation,
  isReadOperation,
  getControllerName,
  isAdapterType,
} from './crud-infra.utils.js';
import { CrudOperationOptions } from './crud-operation-options.type.js';
import {
  ConfigurableCrudClassesMap,
  ConfigurableCrudHost,
} from './interfaces/configurable-crud-host.interface.js';
import {
  ConfigurableCrudGeneratedOptions,
  ConfigurableCrudHybridOptions,
  ConfigurableCrudOptions,
} from './interfaces/configurable-crud-options.interface.js';

export class ConfigurableCrudBuilder<
  Entity extends PlainLiteralObject,
  ExtraOptions extends PlainLiteralObject = PlainLiteralObject,
> {
  private extras: ExtraOptions;
  private optionsTransform: ConfigurableCrudOptionsTransformer<
    Entity,
    ExtraOptions
  >;

  constructor(private options: ConfigurableCrudOptions<Entity>) {
    this.extras = {} as ExtraOptions;
    this.optionsTransform = (options, _extras) => options;
  }

  setExtras(
    extras: ExtraOptions,
    optionsTransform: ConfigurableCrudOptionsTransformer<Entity, ExtraOptions>,
  ): ConfigurableCrudBuilder<Entity, ExtraOptions> {
    this.extras = extras;
    this.optionsTransform = optionsTransform;
    return this;
  }

  /**
   * Build the CRUD configuration and return generated classes.
   *
   * Returns an object with:
   * - `providers` - All providers needed for the module (adapter, handlers)
   * - `controllers` - Controller classes by name
   * - `queries` - Query classes by name (for read operations)
   * - `queryHandlers` - Query handler classes by name
   * - `commands` - Command classes by name (for write operations)
   * - `commandHandlers` - Command handler classes by name
   * - `adapters` - Adapter classes by name
   *
   * @example
   * ```typescript
   * const { providers, controllers, queries, queryHandlers } = new ConfigurableCrudBuilder<UserEntity>({
   *   controller: {
   *     entity: 'User',
   *     path: 'users',
   *     adapter: CrudAdapter, // optional, defaults to CrudAdapter
   *   },
   *   operations: [{ operation: Operation.List }],
   * }).build();
   *
   * // Destructure generated classes by name:
   * const { UserController } = controllers;
   * const { UserCrudListQuery } = queries;
   * const { User_list_Handler } = queryHandlers;
   * ```
   */
  build(): ConfigurableCrudHost {
    const options = this.optionsTransform(this.options, this.extras);

    // Path 3: Hybrid - class with operations
    if (this.isHybridOptions(options)) {
      return this.buildHybrid(options.controller.class, options.operations);
    }

    if (this.isControllerClassOptions(options.controller)) {
      // Path 1: Pre-decorated class - generate handlers and adapter provider
      const controllerClass = options.controller.class;
      const { handlers, queries, queryHandlers, commands, commandHandlers } =
        this.collectClassesFromController(controllerClass);

      // Extract adapter from controller metadata
      const reflectionService = new CrudMetaview<Entity>();
      const entity = reflectionService.getEntity(controllerClass);
      const adapter = reflectionService.getAdapter(controllerClass);

      if (!entity) {
        throw new CrudDecoratorException({
          message: `Controller ${controllerClass.name} must have @CrudEntity or @CrudController with entity specified`,
        });
      }

      const hasAdapter = Boolean(adapter && isAdapterType<Entity>(adapter));

      // @CrudEntity alone (without @CrudController) never applies CrudInit,
      // so no query/command classes get resolved and no adapter metadata is
      // stamped — a controller in that state boots clean but 500s on every
      // request. Catch it here instead of at first request.
      if (handlers.length === 0 && !hasAdapter) {
        throw new CrudDecoratorException({
          message: `Controller ${controllerClass.name} has @CrudEntity but no CRUD operations were resolved and no adapter provider was found. Use @CrudController (which wires operations via @CrudInit), not @CrudEntity alone.`,
        });
      }

      const providers: Provider[] = [...handlers];
      const adapters: ConfigurableCrudClassesMap = {};

      // Create adapter provider if we have an adapter type
      if (hasAdapter && adapter) {
        providers.unshift(
          createCrudAdapterProvider<Entity>({ entity, adapter }),
        );
        adapters[adapter.name] = adapter;
      }

      return {
        providers,
        controllers: { [controllerClass.name]: controllerClass },
        queries,
        queryHandlers,
        commands,
        commandHandlers,
        adapters,
      };
    }

    if (!this.isGeneratedOptions(options)) {
      throw new Error('Invalid options: expected operations array');
    }

    // Path 2: Generate new class from controller options
    const { controller, operations } = options;

    // Validate operations have unique method names
    this.validateOperations(operations);

    // Resolve adapter class to factory provider if needed
    const adapter = controller.adapter ?? CrudAdapter;
    const adapterProvider = isAdapterType<Entity>(adapter)
      ? createCrudAdapterProvider<Entity>({
          entity: controller.entity,
          adapter,
        })
      : adapter;

    // Build controller config with resolved adapter
    const resolvedController = { ...controller, adapter: adapterProvider };

    // Generate controller class
    const ConfigurableControllerClass = this.generateClass(
      operations,
      resolvedController,
    );

    // Collect classes from the controller's decorator metadata
    const { handlers, queries, queryHandlers, commands, commandHandlers } =
      this.collectClassesFromController(ConfigurableControllerClass);

    // Build adapters map
    const adapters: ConfigurableCrudClassesMap = {};
    if (isAdapterType<Entity>(adapter)) {
      adapters[adapter.name] = adapter;
    }

    return {
      providers: [adapterProvider, ...handlers],
      controllers: {
        [ConfigurableControllerClass.name]: ConfigurableControllerClass,
      },
      queries,
      queryHandlers,
      commands,
      commandHandlers,
      adapters,
    };
  }

  /**
   * Validate that all operations have unique method names.
   */
  private validateOperations(operations: CrudOperationOptions<Entity>[]): void {
    const methodNames = new Set<string>();

    for (const op of operations) {
      const methodName = op.methodName ?? op.operation;

      if (methodNames.has(methodName)) {
        throw new Error(
          `Duplicate method name "${methodName}" in operations. ` +
            `When using multiple operations with the same operation type, each must have a unique methodName.`,
        );
      }
      methodNames.add(methodName);
    }
  }

  /**
   * Get the operation decorator for a given operation type.
   */
  private getOperationDecorator(
    operation: Operation,
    options: Record<string, unknown>,
  ): MethodDecorator {
    switch (operation) {
      case Operation.List:
        return CrudList<Entity>(options);
      case Operation.Read:
        return CrudRead<Entity>(options);
      case Operation.Create:
        return CrudCreate<Entity>(options);
      case Operation.CreateBatch:
        return CrudCreateBatch<Entity>(options);
      case Operation.Update:
        return CrudUpdate<Entity>(options);
      case Operation.Replace:
        return CrudReplace<Entity>(options);
      case Operation.Delete:
        return CrudDelete<Entity>(options);
      case Operation.SoftDelete:
        return CrudSoftDelete<Entity>(options);
      case Operation.Restore:
        return CrudRestore<Entity>(options);
      default: {
        const _exhaustive: never = operation;
        throw new Error(`Unsupported operation: ${_exhaustive}`);
      }
    }
  }

  /**
   * Resolve the transactional method decorator for an operation.
   *
   * When controller-level transactional is enabled, read operations get
   * `@Transactional(false)` to opt out. Per-operation transactional
   * overrides the controller-level setting.
   */
  private getTransactionalDecorator(
    operation: Operation,
    opTransactional?: boolean | TransactionalOptions,
    controllerTransactional?: boolean | TransactionalOptions,
  ): MethodDecorator[] {
    // Explicit per-operation setting takes precedence
    if (opTransactional !== undefined) {
      if (opTransactional === false) {
        return [Transactional(false)];
      }
      const options =
        typeof opTransactional === 'object' ? opTransactional : undefined;
      return [Transactional(options)];
    }

    // When controller-level is enabled, opt out read operations
    if (controllerTransactional && isReadOperation(operation)) {
      return [Transactional(false)];
    }

    return [];
  }

  /**
   * Apply all decorators for an operation: operation decorator + parameter decorators.
   */
  private applyOperationDecorators(
    controllerClass: Type,
    methodName: string,
    op: CrudOperationOptions<Entity>,
    operationIdPrefix: string,
    controllerTransactional?: boolean | TransactionalOptions,
  ): void {
    const {
      operation,
      extraDecorators = [],
      transactional: opTransactional,
      ...restOptions
    } = op;
    const proto = controllerClass.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);

    // Build options with operationId
    const optionsWithId = {
      ...restOptions,
      api: {
        ...restOptions.api,
        operation: {
          operationId: `${operationIdPrefix}_${methodName}`,
          ...restOptions.api?.operation,
        },
      },
    };

    // Apply operation decorator with transactional + extra decorators
    const txDecorators = this.getTransactionalDecorator(
      operation,
      opTransactional,
      controllerTransactional,
    );
    const opDecorator = this.getOperationDecorator(operation, optionsWithId);
    applyDecorators(opDecorator, ...txDecorators, ...extraDecorators)(
      proto,
      methodName,
      descriptor,
    );

    // Apply parameter decorators
    this.applyParameterDecorators(controllerClass, methodName, op);
  }

  /**
   * Apply only parameter decorators (CrudContext, CrudBody) without operation decorator.
   * Also applies handler overrides if specified in the operation.
   * Used for hybrid controllers where the method already has the operation decorator applied.
   */
  private applyParameterDecorators(
    controllerClass: Type,
    methodName: string,
    op: CrudOperationOptions<Entity>,
  ): void {
    const { operation } = op;
    const proto = controllerClass.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(proto, methodName);

    // Apply CrudContext to first parameter
    Ctx(CrudCtx)(proto, methodName, 0);

    // Apply CrudBody to second parameter if operation requires body
    if (isBodyOperation(operation)) {
      const bodySchema =
        operation === Operation.CreateBatch
          ? op.request?.bodyBatch
          : op.request?.body;
      CrudBody({ schema: bodySchema })(proto, methodName, 1);
    }

    // Apply handler overrides if specified
    if (descriptor) {
      if (isReadOperation(operation)) {
        const queryOptions = op as CrudRouteQueryOptionsInterface<Entity>;
        if (queryOptions.queryHandler) {
          CrudQueryHandler<Entity>({ handler: queryOptions.queryHandler })(
            proto,
            methodName,
            descriptor,
          );
        }
      } else {
        const commandOptions = op as CrudRouteCommandOptionsInterface<Entity>;
        if (commandOptions.commandHandler) {
          CrudCommandHandler<Entity>({
            handler: commandOptions.commandHandler,
          })(proto, methodName, descriptor);
        }
      }
    }
  }

  /**
   * Result of collecting classes from controller.
   */
  private collectClassesResult(): {
    handlers: Type[];
    queries: ConfigurableCrudClassesMap;
    queryHandlers: ConfigurableCrudClassesMap;
    commands: ConfigurableCrudClassesMap;
    commandHandlers: ConfigurableCrudClassesMap;
  } {
    return {
      handlers: [],
      queries: {},
      queryHandlers: {},
      commands: {},
      commandHandlers: {},
    };
  }

  /**
   * Extract handlers and CQRS classes from a controller's decorated methods.
   */
  private collectClassesFromController(
    controller: Type,
  ): ReturnType<typeof this.collectClassesResult> {
    const reflectionService = new CrudMetaview<Entity>();
    const result = this.collectClassesResult();

    const methodNames = this.getControllerMethodNames(controller);

    for (const methodName of methodNames) {
      const method = controller.prototype[methodName];
      const operation = reflectionService.getOperation(method);

      if (!operation) continue;

      if (isReadOperation(operation)) {
        // Collect query class
        const queryOptions = reflectionService.getQuery(method);
        if (queryOptions?.resolved) {
          result.queries[queryOptions.resolved.name] = queryOptions.resolved;
        }
        // Collect query handler
        const queryHandlerOptions = reflectionService.getQueryHandler(method);
        if (queryHandlerOptions?.resolved) {
          result.handlers.push(queryHandlerOptions.resolved);
          result.queryHandlers[queryHandlerOptions.resolved.name] =
            queryHandlerOptions.resolved;
        }
      } else {
        // Collect command class
        const commandOptions = reflectionService.getCommand(method);
        if (commandOptions?.resolved) {
          result.commands[commandOptions.resolved.name] =
            commandOptions.resolved;
        }
        // Collect command handler
        const commandHandlerOptions =
          reflectionService.getCommandHandler(method);
        if (commandHandlerOptions?.resolved) {
          result.handlers.push(commandHandlerOptions.resolved);
          result.commandHandlers[commandHandlerOptions.resolved.name] =
            commandHandlerOptions.resolved;
        }
      }
    }

    return result;
  }

  /**
   * Get all method names from a controller, including inherited methods.
   */
  private getControllerMethodNames(controller: Type): string[] {
    const methods = new Set<string>();
    let proto = controller.prototype;

    while (proto && proto !== Object.prototype) {
      for (const name of Object.getOwnPropertyNames(proto)) {
        if (name !== 'constructor' && typeof proto[name] === 'function') {
          methods.add(name);
        }
      }
      proto = Object.getPrototypeOf(proto);
    }

    return Array.from(methods);
  }

  /**
   * Create a method implementation for a given operation type.
   */
  private createMethodImplementation(operation: Operation): CallableFunction {
    switch (operation) {
      case Operation.List:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
        ) {
          return this.crudResolver.list(ctx);
        };
      case Operation.Read:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
        ) {
          return this.crudResolver.read(ctx);
        };
      case Operation.Create:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
          dto: DeepPartial<Entity>,
        ) {
          return this.crudResolver.create(ctx, dto);
        };
      case Operation.CreateBatch:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
          dto: CrudCreateBatchInterface<DeepPartial<Entity>>,
        ) {
          return this.crudResolver.createBatch(ctx, dto);
        };
      case Operation.Update:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
          dto: DeepPartial<Entity>,
        ) {
          return this.crudResolver.update(ctx, dto);
        };
      case Operation.Replace:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
          dto: DeepPartial<Entity>,
        ) {
          return this.crudResolver.replace(ctx, dto);
        };
      case Operation.Delete:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
        ) {
          return this.crudResolver.delete(ctx);
        };
      case Operation.SoftDelete:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
        ) {
          return this.crudResolver.softDelete(ctx);
        };
      case Operation.Restore:
        return function (
          this: { crudResolver: CrudResolverInterface },
          ctx: CrudContextInterface<Entity>,
        ) {
          return this.crudResolver.restore(ctx);
        };
      default: {
        const _exhaustive: never = operation;
        throw new Error(`Unsupported operation: ${_exhaustive}`);
      }
    }
  }

  /**
   * Generate a standalone controller class with methods for each operation.
   */
  private generateClass(
    operations: CrudOperationOptions<Entity>[],
    controller: CrudControllerOptionsInterface<Entity>,
  ): Type {
    // Get the resolver class (defaults to CrudAdapterResolver)
    const ResolverClass = controller.resolver ?? CrudAdapterResolver;

    // Create standalone class (no CrudBaseController inheritance)
    class GeneratedController {
      constructor(
        @Inject(ResolverClass)
        protected readonly crudResolver: CrudResolverInterface,
      ) {}
    }

    // Set class name to ${entity}Controller
    Object.defineProperty(GeneratedController, 'name', {
      value: `${controller.entity}Controller`,
    });

    // Generate methods for each operation
    for (const op of operations) {
      const { operation } = op;
      const methodName = op.methodName ?? operation;

      // Create method implementation based on operation type
      Object.defineProperty(GeneratedController.prototype, methodName, {
        value: this.createMethodImplementation(operation),
        writable: true,
        configurable: true,
      });

      // Apply all decorators
      this.applyOperationDecorators(
        GeneratedController,
        methodName,
        op,
        getControllerName(controller),
        controller.transactional,
      );
    }

    // Apply CrudController decorator to class
    const classDecorators: Array<ClassDecorator | MethodDecorator> = [
      CrudController(controller),
    ];

    if (controller.transactional) {
      const txOptions =
        typeof controller.transactional === 'object'
          ? controller.transactional
          : undefined;
      classDecorators.push(Transactional(txOptions));
    }

    classDecorators.push(...(this.options.controller?.extraDecorators ?? []));

    applyDecorators(...classDecorators)(GeneratedController);

    return GeneratedController as Type;
  }

  /**
   * Path 3: Hybrid - class with operations.
   *
   * For each operation:
   * - Determine method name (explicit or default for operation)
   * - If method exists with matching operation → augment/override its options
   * - If method doesn't exist → create new method with implementation + decorators
   */
  private buildHybrid(
    controllerClass: Type,
    operations: CrudOperationOptions<Entity>[],
  ): ConfigurableCrudHost {
    const reflectionService = new CrudMetaview<Entity>();

    // Extract entity, name, and adapter from controller metadata
    const entity = reflectionService.getEntity(controllerClass);
    const name = reflectionService.getName(controllerClass);
    const adapter = reflectionService.getAdapter(controllerClass);

    if (!entity) {
      throw new CrudDecoratorException({
        message: `Controller ${controllerClass.name} must have @CrudEntity or @CrudController with entity specified`,
      });
    }

    // Get effective controller name for operationId prefix
    const controllerName = getControllerName({ entity, name });

    // Process each operation
    for (const op of operations) {
      const methodName = op.methodName ?? op.operation;
      const existingMethod = controllerClass.prototype[methodName];

      if (existingMethod) {
        // Method exists - check if operation matches
        const existingOperation =
          reflectionService.getOperation(existingMethod);

        if (existingOperation === op.operation) {
          // Operation matches - only apply parameter decorators
          // Do NOT re-apply operation decorator as it would overwrite resolved query/command metadata
          this.applyParameterDecorators(controllerClass, methodName, op);
        } else {
          throw new Error(
            `Method "${methodName}" on ${controllerClass.name} is decorated with operation ` +
              `"${existingOperation}" but operations array specifies "${op.operation}". ` +
              `Use a different methodName to avoid this conflict.`,
          );
        }
      } else {
        // Method doesn't exist - create new method with implementation
        Object.defineProperty(controllerClass.prototype, methodName, {
          value: this.createMethodImplementation(op.operation),
          writable: true,
          configurable: true,
        });

        // Apply all decorators
        this.applyOperationDecorators(
          controllerClass,
          methodName,
          op,
          controllerName,
        );
      }
    }

    // Re-run initialization decorators after augmentation
    // This resolves query/command classes and applies @Body decorators
    CrudInit()(controllerClass);

    // Collect classes from the now-decorated controller
    const { handlers, queries, queryHandlers, commands, commandHandlers } =
      this.collectClassesFromController(controllerClass);

    const providers: Provider[] = [...handlers];
    const adapters: ConfigurableCrudClassesMap = {};

    // Create adapter provider if we have adapter type
    if (adapter && isAdapterType<Entity>(adapter)) {
      providers.unshift(createCrudAdapterProvider<Entity>({ entity, adapter }));
      adapters[adapter.name] = adapter;
    }

    return {
      providers,
      controllers: { [controllerClass.name]: controllerClass },
      queries,
      queryHandlers,
      commands,
      commandHandlers,
      adapters,
    };
  }

  /**
   * Type guard to check if options are for hybrid controller (class + operations).
   */
  private isHybridOptions(
    options: ConfigurableCrudOptions<Entity>,
  ): options is ConfigurableCrudHybridOptions<Entity> {
    return (
      this.isControllerClassOptions(options.controller) &&
      'operations' in options &&
      Array.isArray(options.operations)
    );
  }

  /**
   * Type guard to check if options are for generated controller.
   */
  private isGeneratedOptions(
    options: ConfigurableCrudOptions<Entity>,
  ): options is ConfigurableCrudGeneratedOptions<Entity> {
    return (
      !this.isControllerClassOptions(options.controller) &&
      'operations' in options &&
      Array.isArray(options.operations)
    );
  }

  /**
   * Type guard to check if options use the class path.
   */
  private isControllerClassOptions(
    options:
      | CrudControllerClassOptionsInterface
      | CrudControllerOptionsInterface<Entity>,
  ): options is CrudControllerClassOptionsInterface {
    return 'class' in options && options.class !== undefined;
  }
}
