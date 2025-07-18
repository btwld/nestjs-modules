import { ApiResponseOptions } from '@nestjs/swagger';

import { CrudActions } from '../enums/crud-actions.enum';

export interface CrudApiResponseMetadataInterface {
  propertyKey: string | symbol;
  action: CrudActions;
  options: ApiResponseOptions | undefined;
}
