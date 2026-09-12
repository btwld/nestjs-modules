import { type z } from 'zod';

import { HttpStatus } from '@nestjs/common';
import {
  ApiResponse,
  type ApiResponseMetadata,
  type ApiResponseOptions,
} from '@nestjs/swagger';

import { Operation, withOpenApi } from '@concepta/nestjs-core';

import {
  type CrudSchema,
  type DecoratorTargetObject,
} from '../../../crud.types.js';
import { CrudException } from '../../exceptions/crud.exception.js';
import { CrudMetaview } from '../../services/crud-metaview.service.js';

/**
 * Utility decorator used to apply response
 * options *from the controller context*.
 *
 * DO NOT USE THIS DIRECTLY ON METHODS!!!
 */
export function applyApiResponse(
  operation: Operation,
  options: ApiResponseOptions = {},
): MethodDecorator {
  return (target: DecoratorTargetObject, ...rest) => {
    // break out args
    const [propertyKey] = rest;

    // reflection service
    const reflectionService = new CrudMetaview();

    if (!('prototype' in target)) {
      throw new CrudException({
        message:
          'Cannot decorate with apply api response, target must be a class',
        fault: 'usage',
      });
    }

    const handler = target.prototype[propertyKey];

    // get the serialize options
    const serializeOptions = reflectionService.getAllSerializationOptions(
      target,
      handler,
    );

    // determine the response schema
    const schema =
      serializeOptions?.resource ??
      reflectionService.getResponseResource(target, handler);

    // determine the paginated response schema
    const paginatedSchema =
      serializeOptions?.paginated ??
      reflectionService.getResponsePaginated(target, handler);

    // response meta options
    const responseMetaOptions: ApiResponseMetadata = {};

    // the schema actually documented by this operation — used only for the
    // human-readable `description` string below
    let displaySchema: CrudSchema | undefined;

    // operation is the discriminator
    switch (operation) {
      // list (paginated)
      case Operation.List:
        displaySchema = paginatedSchema;
        setSingleResponse(responseMetaOptions, paginatedSchema);
        break;

      // create batch (array response)
      case Operation.CreateBatch:
        displaySchema = schema;
        if (schema !== undefined) {
          assertBridged(schema, 'response schema');
          // withOpenApi (no id) bridges an inline array wrapper so Nest's
          // native path converts it — the named item schema nested inside
          // is hoisted into components.schemas automatically.
          responseMetaOptions.standardSchema = withOpenApi(schema.array());
        }
        break;

      // returns deleted item or empty
      case Operation.Delete:
      case Operation.SoftDelete:
        displaySchema = reflectionService.getReturnDeleted(
          target,
          target.prototype[propertyKey],
        )
          ? schema
          : undefined;
        setSingleResponse(responseMetaOptions, displaySchema);
        break;

      // returns restored item or empty
      case Operation.Restore:
        displaySchema = reflectionService.getReturnRestored(
          target,
          target.prototype[propertyKey],
        )
          ? schema
          : undefined;
        setSingleResponse(responseMetaOptions, displaySchema);
        break;

      // returns one item
      case Operation.Read:
      case Operation.Create:
      case Operation.Update:
      case Operation.Replace:
      default:
        displaySchema = schema;
        setSingleResponse(responseMetaOptions, schema);
        break;
    }

    // merge the options
    const mergedOptions: ApiResponseOptions = {
      status: HttpStatus.OK,
      description: `${operation} ${displayName(displaySchema)}`,
      ...responseMetaOptions,
      ...options,
    };

    ApiResponse(mergedOptions)(target, ...rest);
  };
}

//
// private routines
//

/**
 * Sets `responseMetaOptions.standardSchema` for a single-resource response;
 * a no-op when there is no response schema to document (e.g. Delete/Restore
 * configured not to return the entity).
 */
function setSingleResponse(
  responseMetaOptions: ApiResponseMetadata,
  schema: CrudSchema | undefined,
): void {
  if (schema === undefined) return;
  assertBridged(schema, 'response schema');
  responseMetaOptions.standardSchema = schema;
}

/**
 * A schema missing its `~standard.jsonSchema` bridge (i.e. never passed
 * through `withOpenApi`) would otherwise silently produce an undocumented
 * response (no schema in the OpenAPI output) — fail loudly instead.
 */
function assertBridged(schema: z.ZodType, context: string): void {
  if (!schema['~standard'].jsonSchema?.output) {
    throw new CrudException({
      message: `CRUD ${context} is missing its OpenAPI bridge — wrap it with withOpenApi() before using it as a CRUD response.`,
      fault: 'usage',
    });
  }
}

/**
 * Display name for a response schema — used only for the human-readable
 * `description` string.
 */
function displayName(schema: CrudSchema | undefined): string {
  return schema?.meta()?.id ?? 'Resource';
}
