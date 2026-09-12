import { type CrudBodyOptionsInterface } from './crud-body-options.interface.js';

export interface CrudBodyMetadataInterface {
  parameterIndex: number;
  validation: CrudBodyOptionsInterface['validation'];
  pipes: CrudBodyOptionsInterface['pipes'];
  schema: CrudBodyOptionsInterface['schema'];
}
