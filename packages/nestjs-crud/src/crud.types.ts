import { type z } from 'zod';

import { type PlainLiteralObject, type Type } from '@nestjs/common';

import { type CrudOptionsInterface } from './infrastructure/request/interfaces/crud-options.interface.js';
import { type ConfigurableCrudOptions } from './infrastructure/utils/interfaces/configurable-crud-options.interface.js';

export type CrudValidationOptions<Entity extends PlainLiteralObject> =
  CrudOptionsInterface<Entity>['validation'];

/**
 * A request/response Zod (Standard Schema) schema.
 */
export type CrudSchema<T = unknown> = z.ZodType<T>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type DecoratorTargetObject<T = any> = Type<T> | T;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type ControllerTarget = Function;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type MethodHandler = Function;

export type ConfigurableCrudOptionsTransformer<
  Entity extends PlainLiteralObject,
  T extends PlainLiteralObject,
> = (
  options: ConfigurableCrudOptions<Entity>,
  extras?: T,
) => ConfigurableCrudOptions<Entity>;
