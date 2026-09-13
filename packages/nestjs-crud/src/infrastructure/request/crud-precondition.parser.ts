import { BadRequestException } from '@nestjs/common';

import { type CrudPreconditionInterface } from '../interceptors/interfaces/crud-precondition.interface.js';
import { sanitizeForMessage } from '../utils/validation.js';

const STRONG_ENTITY_TAG = /^"(\d+)"$/;

/**
 * Parse an `If-Match` request header into a `CrudPreconditionInterface`.
 *
 * Supported forms are deliberately narrow: a single strong entity-tag
 * (`If-Match: "3"`) and `If-Match: *`. Comma-separated tag lists exist in
 * RFC 9110 for cache revalidation, not lost-update prevention, and a weak
 * tag (`W/"3"`) is defined to never match under the strong comparison
 * `If-Match` mandates — all three, along with any non-numeric or unquoted
 * value, are rejected as a client protocol error.
 */
export function parseIfMatch(
  value: string | string[] | undefined,
): CrudPreconditionInterface | undefined {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    throw new BadRequestException(
      'Invalid If-Match header: repeated header is not supported',
    );
  }

  const trimmed = value.trim();

  if (trimmed === '*') {
    return {};
  }

  const match = trimmed.match(STRONG_ENTITY_TAG);

  if (!match) {
    throw new BadRequestException(
      `Invalid If-Match header '${sanitizeForMessage(trimmed)}': expected ` +
        'a single strong entity-tag (e.g. "3") or *',
    );
  }

  return { version: Number(match[1]) };
}
