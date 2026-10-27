/**
 * `@concepta/nestjs-repository/optional/outbox`
 *
 * Durable messaging: `@nestjs/outbox` messages and inbox records written in
 * the transaction a repository registration's writes use. Requires the
 * optional peer dependency `@nestjs/outbox`, and a driver that provides
 * durable support; nothing on the package's other entry points imports it,
 * so a consumer that does no durable messaging never installs it.
 */

export { DurableMessaging } from './durable/durable-messaging.service.js';
export { DurableMessagingModule } from './durable/durable-messaging.module.js';
export { DurableMessagingOptionsInterface } from './durable/interfaces/durable-messaging-options.interface.js';
export { DurableDriverInterface } from './durable/interfaces/durable-driver.interface.js';
export { UnsupportedDurableDriverException } from './durable/exceptions/unsupported-durable-driver.exception.js';
