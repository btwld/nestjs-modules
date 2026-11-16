import { type ApiParamOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_PARAMS_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

export type ApiParamMetadata = (ApiParamOptions | undefined)[];

type ApiParamDecoratorFn = (
  options?: ApiParamOptions,
) => <T>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void;

/**
 * \@CrudApiParam() open api decorator.
 * Can be applied multiple times to accumulate parameters.
 */
export const CrudApiParam = CrudMetadata.createWrappedDecorator<
  ApiParamMetadata,
  ApiParamDecoratorFn
>(
  {
    key: CRUD_MODULE_API_PARAMS_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Method,
  },
  (decorator) =>
    (options?: ApiParamOptions) =>
    <T>(
      target: object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>,
    ) => {
      const handler = descriptor.value;

      const existing =
        typeof handler === 'function'
          ? (CrudMetadata.get<ApiParamMetadata>(CrudApiParam, handler) ?? [])
          : [];

      decorator([...existing, options])(target, propertyKey, descriptor);
    },
);
