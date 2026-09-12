import { type CrudSchema } from '../../crud.types.js';

export interface CrudSerializationOptionsInterface {
  resource?: CrudSchema;
  paginated?: CrudSchema;
}
