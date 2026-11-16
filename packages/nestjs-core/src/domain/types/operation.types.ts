import {
  type MutateOperations,
  type ReadOperations,
  type WriteOperations,
} from '../enums/operation.enum.js';

export type ExceptionContext = Record<string, unknown> & {
  originalError?: unknown;
};

/**
 * Type for read operations (List, Read).
 */
export type ReadOperation = (typeof ReadOperations)[number];

/**
 * Type for write operations (Create, CreateBatch, Update, Replace).
 */
export type WriteOperation = (typeof WriteOperations)[number];

/**
 * Type for modify operations (write + delete/restore).
 */
export type MutateOperation = (typeof MutateOperations)[number];
