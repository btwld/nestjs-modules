import { type ApiResponseOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_RESPONSE_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

export type ApiResponseMetadata = (ApiResponseOptions | undefined)[];

type ApiResponseDecoratorFn = (
  options?: ApiResponseOptions,
) => <T>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void;

/**
 * \@CrudApiResponse() open api decorator.
 * Can be applied multiple times to accumulate response options.
 */
export const CrudApiResponse = CrudMetadata.createWrappedDecorator<
  ApiResponseMetadata,
  ApiResponseDecoratorFn
>(
  {
    key: CRUD_MODULE_API_RESPONSE_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Method,
  },
  (decorator) =>
    (options?: ApiResponseOptions) =>
    <T>(
      target: object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>,
    ) => {
      const handler = descriptor.value;

      const existing =
        typeof handler === 'function'
          ? (CrudMetadata.get<ApiResponseMetadata>(CrudApiResponse, handler) ??
            [])
          : [];

      decorator([...existing, options])(target, propertyKey, descriptor);
    },
);
