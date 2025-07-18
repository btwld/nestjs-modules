import { PlainLiteralObject, Type } from '@nestjs/common';

import { CrudOptionsInterface } from './crud/interfaces/crud-options.interface';
import { ConfigurableCrudOptions } from './util/interfaces/configurable-crud-options.interface';

export type CrudValidationOptions = CrudOptionsInterface['validation'];

/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types */
export type DecoratorTargetObject<T = any> = Type<T> | T;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/ban-types */
export type ReflectionTargetOrHandler = Function | Type<any>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type AdditionalCrudMethodArgs = any[];

export type ConfigurableCrudOptionsTransformer<
  Entity extends PlainLiteralObject,
  T extends PlainLiteralObject,
> = (
  options: ConfigurableCrudOptions<Entity>,
  extras?: T,
) => ConfigurableCrudOptions<Entity>;
