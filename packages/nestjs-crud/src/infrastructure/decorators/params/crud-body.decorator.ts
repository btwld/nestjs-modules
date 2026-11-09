import { CRUD_MODULE_PARAM_BODY_METADATA } from '../../../crud.constants.js';
import {
  CrudMetadataLookupTarget,
  CrudMetadata,
} from '../../services/crud-metadata.service.js';
import { getMethodHandler } from '../../utils/crud-infra.utils.js';

import { type CrudBodyMetadataInterface } from './interfaces/crud-body-metadata.interface.js';
import { type CrudBodyOptionsInterface } from './interfaces/crud-body-options.interface.js';

type CrudBodyDecoratorFn = (
  options?: CrudBodyOptionsInterface,
) => ParameterDecorator;

/**
 * \@CrudBody() parameter decorator
 */
export const CrudBody = CrudMetadata.createWrappedDecorator<
  CrudBodyMetadataInterface[],
  CrudBodyDecoratorFn
>(
  {
    key: CRUD_MODULE_PARAM_BODY_METADATA,
    lookupTarget: CrudMetadataLookupTarget.Parameter,
  },
  (decorator) =>
    (options?: CrudBodyOptionsInterface): ParameterDecorator =>
    (target, propertyKey, parameterIndex) => {
      if (propertyKey === undefined) return;
      const handler = getMethodHandler(target, propertyKey);
      const previousValues =
        CrudMetadata.get<CrudBodyMetadataInterface[]>(CrudBody, handler) ?? [];

      const value: CrudBodyMetadataInterface = {
        parameterIndex,
        validation: options?.validation,
        pipes: options?.pipes ?? [],
        schema: options?.schema,
      };

      // Store metadata on the method handler (not the parameter)
      decorator([...previousValues, value])(handler);
    },
);
