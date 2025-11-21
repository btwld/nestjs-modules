import { PlainLiteralObject, Type } from '@nestjs/common';

import { CrudOptionsInterface } from './crud/interfaces/crud-options.interface';
import { ConfigurableCrudOptions } from './util/interfaces/configurable-crud-options.interface';

export type CrudValidationOptions<Entity extends PlainLiteralObject> =
  CrudOptionsInterface<Entity>['validation'];

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type DecoratorTargetObject<T = any> = Type<T> | T;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReflectionTargetOrHandler = CallableFunction | Type<any>;

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export type AdditionalCrudMethodArgs = any[];

export type CrudEntityColumn<Entity extends PlainLiteralObject> = keyof Entity &
  string;

export type ConfigurableCrudOptionsTransformer<
  Entity extends PlainLiteralObject,
  T extends PlainLiteralObject,
> = (
  options: ConfigurableCrudOptions<Entity>,
  extras?: T,
) => ConfigurableCrudOptions<Entity>;
