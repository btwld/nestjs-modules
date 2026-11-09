import { type Logger } from 'drizzle-orm';

/**
 * Creates the Drizzle database a Postgres test runs on, logging its queries
 * to `logger` when given one.
 */
export type DrizzlePostgresConnect = (config: { logger?: Logger }) => unknown;
