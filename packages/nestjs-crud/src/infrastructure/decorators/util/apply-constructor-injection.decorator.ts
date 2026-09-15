import { CrudAdapter } from '../../adapters/crud.adapter.js';

import { InjectCrudAdapter } from './inject-crud-adapter.decorator.js';

/**
 * Creates a decorator that applies DI metadata to a handler class
 * that doesn't have an explicit constructor.
 * Sets up `@InjectCrudAdapter` for the adapter parameter so NestJS can inject it.
 */
export function applyConstructorInjection(entity: string): ClassDecorator {
  return (target) => {
    // For constructor parameters, propertyKey is undefined
    // Cast to bypass TypeScript's strict ParameterDecorator signature
    InjectCrudAdapter(entity)(target, undefined!, 0);
    Reflect.defineMetadata('design:paramtypes', [CrudAdapter], target);
  };
}
