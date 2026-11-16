import { type ApiQueryOptions } from '@nestjs/swagger';

import { CRUD_MODULE_API_QUERY_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';

export type ApiQueryMetadata = (ApiQueryOptions[] | undefined)[];

type ApiQueryDecoratorFn = (
  options?: ApiQueryOptions[],
) => <T>(
  target: object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => void;

/**
 * \@CrudApiQuery() open api decorator.
 * Can be applied multiple times to accumulate query parameters.
 */
export const CrudApiQuery = CrudMetadata.createWrappedDecorator<
  ApiQueryMetadata,
  ApiQueryDecoratorFn
>(
  {
    key: CRUD_MODULE_API_QUERY_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Method,
  },
  (decorator) =>
    (options?: ApiQueryOptions[]) =>
    <T>(
      target: object,
      propertyKey: string | symbol,
      descriptor: TypedPropertyDescriptor<T>,
    ) => {
      const handler = descriptor.value;

      const existing =
        typeof handler === 'function'
          ? (CrudMetadata.get<ApiQueryMetadata>(CrudApiQuery, handler) ?? [])
          : [];

      decorator([...existing, options])(target, propertyKey, descriptor);
    },
);
