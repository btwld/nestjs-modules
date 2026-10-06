import { type PlainLiteralObject } from '@nestjs/common';

import { type Operation } from '@concepta/nestjs-core';

import {
  type CrudRouteCommandOptionsInterface,
  type CrudRouteQueryOptionsInterface,
} from '../interfaces/crud-route-ctlr-options.interface.js';

import { type CrudExtraDecoratorsInterface } from './interfaces/crud-extra-decorators.interface.js';

/**
 * Operation options type - intersection of base props with union of query/command options.
 *
 * Each operation specifies an operation type and optionally a custom method name.
 * Multiple operations with the same operation are allowed when methodName differs.
 */
export type CrudOperationOptions<T extends PlainLiteralObject> = {
  operation: Operation;
  methodName?: string;
} & CrudExtraDecoratorsInterface &
  (CrudRouteQueryOptionsInterface<T> | CrudRouteCommandOptionsInterface<T>);
