import { ApiQueryOptions } from '@nestjs/swagger';

export interface CrudApiQueryMetadataInterface {
  propertyKey: string | symbol;
  options: ApiQueryOptions[] | undefined;
}
