/** The bound registration's transaction key and store (internal). */
export const DURABLE_MESSAGING_BINDING = Symbol('DURABLE_MESSAGING_BINDING');

/**
 * The store again, as a provider of its own, so Nest runs its
 * `onModuleInit` — the schema check, and migration outside production
 * (internal).
 */
export const DURABLE_MESSAGING_STORE = Symbol('DURABLE_MESSAGING_STORE');
