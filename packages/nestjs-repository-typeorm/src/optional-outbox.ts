/**
 * `@concepta/nestjs-repository-typeorm/optional/outbox`
 *
 * TypeORM's durable messaging support, for
 * `DurableMessagingModule.forRoot({ driver: TypeOrmDurable })`. Requires the
 * optional peer dependency `@nestjs/outbox`; nothing on the package's main
 * entry point imports it.
 */

export { TypeOrmDurable } from './durable/typeorm-durable.js';
