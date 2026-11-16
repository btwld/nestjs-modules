import { z } from 'zod';

import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type FileScanOutcomeInterface } from '../../domain/interfaces/file-scan-outcome.interface.js';
import { FILE_SCAN_RESULTS } from '../../domain/interfaces/file-scan-result.type.js';

/**
 * A scan result as a scanner reports it, for parsing a webhook body or
 * queue message before `RecordFileScanResultCommand`.
 */
export const fileScanOutcomeSchema = withOpenApi(
  conformsTo<FileScanOutcomeInterface>()(
    z.object({
      attempt: z
        .union([z.literal(1), z.literal(2)])
        .meta({ description: 'The attempt from the scan request' }),
      result: z
        .enum(FILE_SCAN_RESULTS)
        .meta({ description: 'What the scan found' }),
    }),
  ),
);
