import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type CrudCommandInterface } from '../commands/interfaces/crud-command.interface.js';
import { type CrudQueryInterface } from '../queries/interfaces/crud-query.interface.js';

/**
 * Creates a new class extending the base class with a prefixed name.
 *
 * @param prefix - Prefix for the class name (e.g., 'User')
 * @param baseClass - The base class to extend
 * @returns A new class with name `${prefix}${BaseClass.name}`
 */
function createNamedClass<T extends Type>(prefix: string, baseClass: T): T {
  const NewClass = class extends baseClass {};
  Object.defineProperty(NewClass, 'name', {
    value: `${prefix}${baseClass.name}`,
  });
  return NewClass;
}

/**
 * Creates an entity-specific query class.
 *
 * @param name - Entity name (e.g., 'Company') used for class naming
 * @param baseQuery - The base query class to extend
 */
export function createQuery<Entity extends PlainLiteralObject>(
  name: string,
  baseQuery: Type<CrudQueryInterface<Entity>>,
): Type<CrudQueryInterface<Entity>> {
  return createNamedClass<Type<CrudQueryInterface<Entity>>>(name, baseQuery);
}

/**
 * Creates an entity-specific command class.
 *
 * @param name - Entity name (e.g., 'Company') used for class naming
 * @param baseCommand - The base command class to extend
 */
export function createCommand<Entity extends PlainLiteralObject>(
  name: string,
  baseCommand: Type<CrudCommandInterface<Entity>>,
): Type<CrudCommandInterface<Entity>> {
  return createNamedClass<Type<CrudCommandInterface<Entity>>>(
    name,
    baseCommand,
  );
}
