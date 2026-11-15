/**
 * `@concepta/nestjs-crud/optional/cqrs`
 *
 * The resolver that dispatches CRUD operations through the `@nestjs/cqrs`
 * query and command buses. Requires the optional peer dependency
 * `@nestjs/cqrs`; nothing on the package's main entry point imports it.
 */

export { CrudCqrsResolver } from './infrastructure/resolvers/crud-cqrs.resolver.js';
