import { type DynamicModule, type Provider } from '@nestjs/common';

import { type FileRepositoryInterface } from '../../../domain/repositories/file-repository.interface.js';
import { type FileRepository } from '../../persistence/file.repository.js';

/**
 * A repository class built around the registered entity's repository and the
 * module's mapper. Extend `FileRepository` to write one.
 */
export type FileRepositoryConstructor = new (
  ...args: ConstructorParameters<typeof FileRepository>
) => FileRepositoryInterface;

export interface FileExtrasInterface extends Pick<DynamicModule, 'global'> {
  providers?: Provider[];
  entities: {
    file: string;
  };
  repositories?: {
    file?: FileRepositoryConstructor;
  };
}
