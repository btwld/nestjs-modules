import {
  applyDecorators,
  type CustomDecorator,
  type Type,
} from '@nestjs/common';
import {
  type CreateDecoratorOptions,
  type ReflectableDecorator,
  Reflector,
} from '@nestjs/core';

import { applyAssertTarget } from '../decorators/util/apply-assert-target.decorator.js';

/**
 * Metadata target type for reflection operations.
 * Accepts both Type (class constructor) and Function (method handler).
 */
// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type CrudMetadataTarget = Type | Function;

/**
 * Lookup target for metadata retrieval.
 */
export const CrudMetadataLookupTarget = {
  Method: 'method',
  Class: 'class',
  Parameter: 'parameter',
  MethodAndClass: 'method-and-class',
} as const;

export type CrudMetadataLookupTarget =
  (typeof CrudMetadataLookupTarget)[keyof typeof CrudMetadataLookupTarget];

/**
 * Options for creating a simple CRUD decorator.
 */
export interface CrudDecoratorOptions<
  TConstraint,
> extends CreateDecoratorOptions<TConstraint> {
  lookupTarget: CrudMetadataLookupTarget;
  dedupeBy?: string;
}

/**
 * Metadata properties attached to CRUD decorators.
 */
export interface CrudDecoratorMetadata<_TTransformed = unknown> {
  KEY: string;
  LOOKUP_TARGET: CrudMetadataLookupTarget;
  DEDUPE_BY?: string;
}

/**
 * A reflectable CRUD decorator with lookup configuration.
 * Includes a generic call signature to allow subtypes of TConstraint.
 */
export interface CrudReflectableDecorator<
  TConstraint,
  TTransformed = TConstraint,
>
  extends
    ReflectableDecorator<TConstraint, TTransformed>,
    CrudDecoratorMetadata<TTransformed> {
  <T extends TConstraint>(opts?: T): CustomDecorator;
}

/**
 * Static utility class for CRUD metadata operations.
 *
 * Provides decorator creation and hierarchy-aware metadata retrieval.
 * Uses composition to wrap NestJS Reflector internally.
 */
export class CrudMetadata {
  private static reflector = new Reflector();

  // Prevent instantiation
  private constructor() {}

  /**
   * Build decorator internals shared by createDecorator and createWrappedDecorator.
   */
  private static buildDecorator<TConstraint>(
    options: CrudDecoratorOptions<TConstraint>,
  ): {
    decoratorFn: (opts?: TConstraint) => CustomDecorator;
    metadata: CrudDecoratorMetadata<TConstraint>;
  } {
    const { key, lookupTarget, dedupeBy } = options;
    const baseDecoratorFn = Reflector.createDecorator<TConstraint>({ key });

    const decoratorFn = (opts?: TConstraint): CustomDecorator => {
      // Only apply base decorator if value is provided (not undefined)
      // This prevents Reflector.createDecorator from converting undefined to {}
      const decorators =
        opts === undefined
          ? [applyAssertTarget(lookupTarget)]
          : [applyAssertTarget(lookupTarget), baseDecoratorFn(opts)];

      return Object.assign(applyDecorators(...decorators), {
        KEY: baseDecoratorFn.KEY,
      });
    };

    return {
      decoratorFn,
      metadata: {
        KEY: baseDecoratorFn.KEY,
        LOOKUP_TARGET: lookupTarget,
        DEDUPE_BY: dedupeBy,
      },
    };
  }

  /**
   * Create a simple CRUD decorator.
   */
  static createDecorator<TConstraint>(
    options: CrudDecoratorOptions<TConstraint>,
  ): CrudReflectableDecorator<TConstraint> {
    const { decoratorFn, metadata } = this.buildDecorator(options);
    return Object.assign(decoratorFn, metadata);
  }

  /**
   * Create a CRUD decorator with a custom generic signature.
   *
   * @param options - The decorator options
   * @param wrapper - Function that wraps the decorator
   */
  static createWrappedDecorator<
    TConstraint,
    TWrapper extends (...args: never[]) => unknown,
  >(
    options: CrudDecoratorOptions<TConstraint>,
    wrapper: (decorator: (opts?: TConstraint) => CustomDecorator) => TWrapper,
  ): TWrapper & CrudDecoratorMetadata<TConstraint> {
    const { decoratorFn, metadata } = this.buildDecorator(options);
    return Object.assign(wrapper(decoratorFn), metadata);
  }

  /**
   * Get metadata value from a single target (no hierarchy walking).
   */
  static get<TTransformed>(
    decorator: CrudDecoratorMetadata<TTransformed>,
    target: CrudMetadataTarget,
  ): TTransformed | undefined {
    return this.reflector.get<TTransformed, string>(decorator.KEY, target);
  }

  /**
   * Get scalar metadata value with hierarchy-aware lookup.
   *
   * Uses getAllAndOverride semantics (first defined value wins).
   *
   * Retrieves metadata based on the decorator's lookup target:
   * - Method: looks up on handler only
   * - Class: walks class hierarchy
   * - Parameter: looks up on handler (where param metadata is stored)
   * - MethodAndClass: checks handler first, then walks class hierarchy
   */
  static getHierarchy<TTransformed>(
    decorator: CrudDecoratorMetadata<TTransformed>,
    handler: CrudMetadataTarget,
    cls?: CrudMetadataTarget,
  ): TTransformed | undefined {
    const targets = this.buildTargets(decorator.LOOKUP_TARGET, handler, cls);

    if (targets.length === 0) return undefined;

    return this.reflector.getAllAndOverride<TTransformed, string>(
      decorator.KEY,
      targets,
    );
  }

  /**
   * Get array metadata values with hierarchy-aware merge.
   *
   * Uses getAllAndMerge semantics (concatenate arrays, deduplicate).
   * When the decorator has DEDUPE_BY, deduplicates by that property.
   * Otherwise deduplicates by reference equality (Set).
   */
  static getHierarchyArray<TElement>(
    decorator: CrudDecoratorMetadata<TElement[]>,
    handler: CrudMetadataTarget,
    cls?: CrudMetadataTarget,
  ): TElement[] | undefined {
    const targets = this.buildTargets(decorator.LOOKUP_TARGET, handler, cls);

    if (targets.length === 0) return undefined;

    const values = this.reflector.getAll<TElement[][], string>(
      decorator.KEY,
      targets,
    );
    if (!values.some((v) => v !== undefined)) return undefined;

    const combined = this.reflector.getAllAndMerge<TElement[], string>(
      decorator.KEY,
      targets,
    );

    if (decorator.DEDUPE_BY) {
      return this.deduplicateByProperty(combined, decorator.DEDUPE_BY);
    }

    return [...new Set(combined)];
  }

  /**
   * Get all metadata values from the hierarchy as an array.
   */
  static getAll<TTransformed>(
    decorator: CrudDecoratorMetadata<TTransformed>,
    handler: CrudMetadataTarget,
    cls?: CrudMetadataTarget,
  ): TTransformed[] {
    const targets = this.buildTargets(decorator.LOOKUP_TARGET, handler, cls);
    return this.reflector
      .getAll<TTransformed[], string>(decorator.KEY, targets)
      .filter((v) => v !== undefined);
  }

  private static buildTargets(
    lookupTarget: CrudMetadataLookupTarget,
    handler: CrudMetadataTarget,
    cls?: CrudMetadataTarget,
  ): CrudMetadataTarget[] {
    const targets: CrudMetadataTarget[] = [];

    switch (lookupTarget) {
      case CrudMetadataLookupTarget.Method:
      case CrudMetadataLookupTarget.Parameter:
        // Parameter metadata is stored on the method handler
        targets.push(handler);
        break;
      case CrudMetadataLookupTarget.Class:
        this.walkClassHierarchy(cls ?? handler, targets);
        break;
      case CrudMetadataLookupTarget.MethodAndClass:
        targets.push(handler);
        if (cls) this.walkClassHierarchy(cls, targets);
        break;
    }

    return targets;
  }

  private static walkClassHierarchy(
    cls: CrudMetadataTarget,
    targets: CrudMetadataTarget[],
  ): void {
    let current: CrudMetadataTarget | null = cls;
    while (current && current !== Function.prototype && current.name) {
      targets.push(current);
      current = Object.getPrototypeOf(current);
    }
  }

  private static isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
  }

  private static deduplicateByProperty<T>(array: T[], property: string): T[] {
    const seen = new Set<unknown>();
    const result: T[] = [];
    for (const item of array) {
      if (!this.isRecord(item)) {
        throw new TypeError(
          `deduplicateByProperty expected object, got ${typeof item}`,
        );
      }
      const key = item[property];
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    }
    return result;
  }
}
