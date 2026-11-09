import { type ReferenceId } from '@concepta/nestjs-core';

/**
 * Implemented by an entity that refers to a file.
 */
export interface FileOwnableInterface {
  fileId: ReferenceId;
}
