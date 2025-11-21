import { TYPEORM_EXT_MODULE_DEFAULT_DATA_SOURCE_NAME } from '../typeorm-ext.constants';
import { TypeOrmExtDataSourceToken } from '../typeorm-ext.types';

export function resolveDataSourceName(
  dataSource: TypeOrmExtDataSourceToken,
): string {
  return typeof dataSource === 'string'
    ? dataSource
    : (dataSource.name ?? TYPEORM_EXT_MODULE_DEFAULT_DATA_SOURCE_NAME);
}
