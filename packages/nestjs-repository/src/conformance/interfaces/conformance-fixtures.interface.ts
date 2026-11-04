import { type ConformanceAuthorInterface } from './conformance-author.interface.js';
import { type ConformanceAwardInterface } from './conformance-award.interface.js';
import { type ConformanceBookWithEagerAuthorInterface } from './conformance-book-with-eager-author.interface.js';
import { type ConformanceBookInterface } from './conformance-book.interface.js';
import { type ConformanceItemInterface } from './conformance-item.interface.js';
import { type ConformancePlainItemInterface } from './conformance-plain-item.interface.js';
import { type ConformanceTagInterface } from './conformance-tag.interface.js';
import { type ConformanceTenantOrderLineInterface } from './conformance-tenant-order-line.interface.js';
import { type ConformanceTenantOrderInterface } from './conformance-tenant-order.interface.js';
import { type ConformanceUniqueItemInterface } from './conformance-unique-item.interface.js';

/**
 * Every entity the conformance suite reads and writes, by fixture key. A
 * harness maps each key to the driver's own entity for that shape.
 */
export interface ConformanceFixturesInterface {
  item: ConformanceItemInterface;
  plainItem: ConformancePlainItemInterface;
  uniqueItem: ConformanceUniqueItemInterface;
  author: ConformanceAuthorInterface;
  award: ConformanceAwardInterface;
  book: ConformanceBookInterface;
  bookWithEagerAuthor: ConformanceBookWithEagerAuthorInterface;
  tag: ConformanceTagInterface;
  tenantOrder: ConformanceTenantOrderInterface;
  tenantOrderLine: ConformanceTenantOrderLineInterface;
}
