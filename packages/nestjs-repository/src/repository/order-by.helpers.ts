import { type PlainLiteralObject } from '@nestjs/common';

import { RuntimeException } from '@concepta/nestjs-core';

import {
  type OrderSortKeyAsc,
  type OrderSortKeyDesc,
} from './interfaces/order-sort-key.interface.js';
import {
  type EntityColumn,
  type OrderClause,
  type OrderSortKey,
  SortOrder,
} from './repository.types.js';

/**
 * Order clause builder with both static and instance APIs.
 *
 * @example Static usage (pass Entity as generic per call):
 * ```typescript
 * repository.find(OrderBy.order(OrderBy.asc<User>('name')));
 * repository.find(OrderBy.order(OrderBy.desc<User>('createdAt'), OrderBy.asc<User>('name')));
 * ```
 *
 * @example Typed builder (Entity bound via factory):
 * ```typescript
 * const o = OrderBy.for<User>();
 * repository.find(o.order(o.desc('createdAt'), o.asc('name')));
 * ```
 */
export class OrderBy<Entity extends PlainLiteralObject = PlainLiteralObject> {
  // ═══════════════════════════════════════════════════════════════════════════
  // Static API
  // ═══════════════════════════════════════════════════════════════════════════

  static asc<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
  ): OrderSortKeyAsc<E> {
    return { field, order: SortOrder.ASC };
  }

  static desc<E extends PlainLiteralObject = PlainLiteralObject>(
    field: EntityColumn<E>,
  ): OrderSortKeyDesc<E> {
    return { field, order: SortOrder.DESC };
  }

  /**
   * Tag an OrderSortKey with a relation name.
   *
   * @example
   * ```typescript
   * OrderBy.rel('posts', OrderBy.asc('title'))
   * // => { field: 'title', order: 'ASC', relation: 'posts' }
   * ```
   */
  static rel<
    E extends PlainLiteralObject = PlainLiteralObject,
    K extends OrderSortKey<E> = OrderSortKey<E>,
  >(relation: string, key: K): K {
    return { ...key, relation };
  }

  /**
   * Parse a dot-notation field and tag the key with the extracted relation.
   *
   * @example
   * ```typescript
   * OrderBy.relDot('blog.title', OrderBy.asc('title'))
   * // => { field: 'title', order: 'ASC', relation: 'blog' }
   * ```
   */
  static relDot<
    E extends PlainLiteralObject = PlainLiteralObject,
    K extends OrderSortKey<E> = OrderSortKey<E>,
  >(dotField: string, key: K): K {
    const parts = dotField.split('.');
    if (parts.length === 1) return key;
    if (parts.length !== 2 || !parts[0]) {
      throw new RuntimeException({
        message: 'relDot expects "relation.field" dot notation, got "%s"',
        messageParams: [
          String(dotField)
            .replace(/[^\w.]/g, '')
            .substring(0, 100),
        ],
        fault: 'usage',
      });
    }
    return { ...key, relation: parts[0] };
  }

  static order(...keys: OrderSortKey[]): { order: OrderClause } {
    return { order: keys };
  }

  static for<E extends PlainLiteralObject>(): OrderBy<E> {
    return new OrderBy<E>();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Instance API (field names checked against Entity)
  // ═══════════════════════════════════════════════════════════════════════════

  asc(field: EntityColumn<Entity>): OrderSortKeyAsc<Entity> {
    return OrderBy.asc(field);
  }

  desc(field: EntityColumn<Entity>): OrderSortKeyDesc<Entity> {
    return OrderBy.desc(field);
  }

  rel<K extends OrderSortKey<Entity> = OrderSortKey<Entity>>(
    relation: string,
    key: K,
  ): K {
    return OrderBy.rel(relation, key);
  }

  relDot<K extends OrderSortKey<Entity> = OrderSortKey<Entity>>(
    dotField: string,
    key: K,
  ): K {
    return OrderBy.relDot(dotField, key);
  }

  order(...keys: OrderSortKey<Entity>[]): { order: OrderClause<Entity> } {
    return { order: keys };
  }
}
