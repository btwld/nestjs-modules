import { z } from 'zod';

import { conformsTo, withNamedComponent } from '@concepta/nestjs-core';
import { mutableAggregateSchema } from '@concepta/nestjs-core/aggregate';

import { FILE_STATUSES } from '../../domain/interfaces/file-status.type.js';
import { type FileInterface } from '../../domain/interfaces/file.interface.js';

export const fileSchema = withNamedComponent(
  conformsTo<FileInterface>()(
    mutableAggregateSchema.extend({
      serviceKey: z
        .string()
        .min(1)
        .meta({ description: 'Storage service key' }),
      fileName: z
        .string()
        .min(1)
        .meta({ description: 'File name, including any path' }),
      contentType: z.string().min(1).meta({ description: 'Content type' }),
      status: z.enum(FILE_STATUSES).meta({ description: 'Lifecycle status' }),
    }),
  ),
  'File',
);
