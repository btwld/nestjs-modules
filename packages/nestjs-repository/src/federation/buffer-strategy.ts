import { FEDERATION_MAX_BUFFER_SIZE } from './federation.constants.js';

/**
 * Manages offset-based pagination for iterative constraint discovery.
 *
 * Addresses the "sparse data problem" in relation-first federation:
 * when sorting by a relation field, the first page of sorted relations
 * might only correspond to a few unique root entities.
 *
 * Progressively fetches more relation data until enough unique root IDs
 * are discovered to satisfy the requested limit.
 */
export class BufferStrategy {
  private currentOffset = 0;
  private readonly batchSize: number;
  private readonly maxOffset: number;

  constructor(
    userLimit: number,
    options: { batchSize?: number; maxOffset?: number } = {},
  ) {
    const { batchSize = userLimit, maxOffset = FEDERATION_MAX_BUFFER_SIZE } =
      options;

    this.batchSize = batchSize;
    this.maxOffset = Math.min(maxOffset, FEDERATION_MAX_BUFFER_SIZE);
  }

  /** Advance to next batch and return parameters. */
  advance(): { limit: number; offset: number } {
    const limit = this.batchSize;
    const offset = this.currentOffset;
    this.currentOffset += limit;
    return { limit, offset };
  }

  /** Check if maximum offset has been reached. */
  hasReachedLimit(): boolean {
    return this.currentOffset >= this.maxOffset;
  }
}
