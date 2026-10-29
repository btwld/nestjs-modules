/**
 * `@concepta/nestjs-repository/conformance`
 *
 * The repository driver contract as a test suite: what a driver reports,
 * how it translates reads, what it persists, and what it refuses. Every
 * driver runs it, once per database, against its own entities for the
 * suite's fixtures. Nothing here imports a test runner; the runner's
 * functions are passed in.
 */

export { runRepositoryConformance } from './conformance/run-repository-conformance.js';
export {
  ConformanceHarnessInterface,
  ConformanceFixtureBinding,
  ConformanceFixtureBindings,
} from './conformance/interfaces/conformance-harness.interface.js';
export {
  ConformanceCapabilitiesInterface,
  ConformanceCapability,
} from './conformance/interfaces/conformance-capabilities.interface.js';
export { ConformanceTestApiInterface } from './conformance/interfaces/conformance-test-api.interface.js';
export { ConformanceFixturesInterface } from './conformance/interfaces/conformance-fixtures.interface.js';
export { ConformanceItemInterface } from './conformance/interfaces/conformance-item.interface.js';
export { ConformancePlainItemInterface } from './conformance/interfaces/conformance-plain-item.interface.js';
export { ConformanceAuthorInterface } from './conformance/interfaces/conformance-author.interface.js';
export { ConformanceBookInterface } from './conformance/interfaces/conformance-book.interface.js';
export { ConformanceBookWithEagerAuthorInterface } from './conformance/interfaces/conformance-book-with-eager-author.interface.js';
export { ConformanceTagInterface } from './conformance/interfaces/conformance-tag.interface.js';
export { ConformanceTenantOrderInterface } from './conformance/interfaces/conformance-tenant-order.interface.js';
export { ConformanceTenantOrderLineInterface } from './conformance/interfaces/conformance-tenant-order-line.interface.js';
