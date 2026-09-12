import { type PlainLiteralObject } from '@nestjs/common';

import { type ActionEnum, type Operation } from '@concepta/nestjs-core';

import { type CrudParsedQueryInterface } from '../../request/interfaces/crud-parsed-query.interface.js';
import { type CrudSpecContextInterface } from '../../specifications/interfaces/crud-spec-context.interface.js';

import { type CrudContextOptionsInterface } from './crud-context-options.interface.js';

export interface CrudContextInterface<
  T extends PlainLiteralObject = PlainLiteralObject,
>
  extends PlainLiteralObject, CrudSpecContextInterface {
  /**
   * The entity name for this CRUD context (used for adapter resolution).
   */
  entity: string;
  /**
   * Route parameter values from URL path (e.g., `\{ id: 5, userId: 'abc' \}`).
   * Simple key-value object, not WhereCondition[].
   */
  params: Record<string, unknown>;
  /**
   * Parsed query string parameters (filter, sort, pagination, etc.).
   */
  query: CrudParsedQueryInterface<T>;
  /**
   * Options for the current request including query and route configuration.
   */
  options: CrudContextOptionsInterface<T>;
  /**
   * The CRUD operation being performed (List, Read, Create, etc.).
   */
  operation: Operation;
  /**
   * The action category (CREATE, READ, UPDATE, DELETE).
   */
  action: ActionEnum;
}
