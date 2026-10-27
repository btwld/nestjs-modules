import { conformsTo, withOpenApi } from '@concepta/nestjs-core';

import { type FileCreatableInterface } from '../../domain/interfaces/file-creatable.interface.js';

import { fileSchema } from './file.schema.js';

export const fileCreateSchema = withOpenApi(
  conformsTo<FileCreatableInterface>()(
    fileSchema.pick({ serviceKey: true, fileName: true, contentType: true }),
  ),
);
