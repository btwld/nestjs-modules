import { ApiParamOptions } from '@nestjs/swagger';

export interface CrudApiParamMetadataInterface {
  propertyKey: string | symbol;
  options: ApiParamOptions | undefined;
}
