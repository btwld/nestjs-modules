import { Injectable, type Type } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';

import { createCommand } from '../../../application/utils/create-operation-classes.js';
import { createCommandHandler } from '../../../application/utils/create-operation-handlers.js';
import { CrudAdapterResolver } from '../../resolvers/crud-adapter.resolver.js';
import { CrudMetaview } from '../../services/crud-metaview.service.js';
import {
  hasExplicitConstructor,
  getControllerName,
} from '../../utils/crud-infra.utils.js';
import { CrudCommandHandler } from '../routes/crud-command-handler.decorator.js';
import { CrudCommand } from '../routes/crud-command.decorator.js';
import { applyConstructorInjection } from '../util/apply-constructor-injection.decorator.js';

/**
 * Resolves command and command handler options for controller methods that have an operation.
 *
 * This decorator should be applied after operation decorators (CrudCreate, CrudUpdate, etc.)
 * to resolve deferred options and generate command/handler classes with proper names.
 *
 * Always re-resolves to support re-running after metadata changes.
 */
export const CrudInitCommand =
  (): ClassDecorator =>
  (...args: Parameters<ClassDecorator>) => {
    const [classTarget] = args;
    const prototype = classTarget.prototype;
    const reflectionService = new CrudMetaview();
    const scanner = new MetadataScanner();

    for (const methodName of scanner.getAllMethodNames(prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
      if (!descriptor) continue;

      // Only process methods that have an operation set
      const operation = reflectionService.getOperation(descriptor.value);
      if (!operation) continue;

      // Get stored command options
      const commandOptions = reflectionService.getCommand(descriptor.value);

      // Skip if no command options (operation uses queries instead)
      if (!commandOptions) continue;

      // Get entity and name from controller metadata
      const entity = reflectionService.getEntity(classTarget);
      const name = reflectionService.getName(classTarget);

      if (!entity) {
        throw new Error(
          `CrudCommand on ${classTarget.name}.${methodName} requires controller entity (use @CrudEntity or @CrudController)`,
        );
      }

      const controllerName = getControllerName({ entity, name });

      // --- Resolve Command Class ---
      let resolvedCommand: Type;

      if (commandOptions.command) {
        resolvedCommand = commandOptions.command;
      } else if (commandOptions.commandTemplate) {
        resolvedCommand = createCommand(
          controllerName,
          commandOptions.commandTemplate,
        );
      } else {
        throw new Error(
          `CrudCommand on ${classTarget.name}.${methodName} requires either command or commandTemplate`,
        );
      }

      // Update command metadata with resolved
      CrudCommand({ ...commandOptions, resolved: resolvedCommand })(
        prototype,
        methodName,
        descriptor,
      );

      // --- Resolve Command Handler ---
      const handlerOptions = reflectionService.getCommandHandler(
        descriptor.value,
      );

      // Handler options should always exist for command actions
      if (!handlerOptions) {
        throw new Error(
          `CrudCommandHandler on ${classTarget.name}.${methodName} requires handler options`,
        );
      }

      let resolvedHandler: Type;

      // Get the resolver class for handler decoration (controller > default)
      const resolverClass =
        reflectionService.getResolver(classTarget, descriptor.value) ??
        CrudAdapterResolver;

      if (handlerOptions.handler) {
        resolvedHandler = handlerOptions.handler;

        // Apply @Injectable() universally to all handlers
        Injectable()(resolvedHandler);

        // Let resolver add any additional decorators (e.g., @CommandHandler for CQRS)
        resolverClass.decorateCommandHandler(resolvedHandler, resolvedCommand);

        // If no explicit constructor, apply DI for adapter injection
        if (!hasExplicitConstructor(resolvedHandler)) {
          applyConstructorInjection(entity)(resolvedHandler);
        }
      } else if (handlerOptions.handlerTemplate) {
        resolvedHandler = createCommandHandler({
          entity,
          name,
          methodName,
          baseClass: handlerOptions.handlerTemplate,
          commandClass: resolvedCommand,
          resolverClass,
        });
      } else {
        throw new Error(
          `CrudCommandHandler on ${classTarget.name}.${methodName} requires either handler or handlerTemplate`,
        );
      }

      // Update handler metadata with resolved
      CrudCommandHandler({ ...handlerOptions, resolved: resolvedHandler })(
        prototype,
        methodName,
        descriptor,
      );
    }
  };
