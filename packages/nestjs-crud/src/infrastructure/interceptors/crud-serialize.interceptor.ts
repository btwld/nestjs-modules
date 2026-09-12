import { from, Observable } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { type z } from 'zod';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PlainLiteralObject,
  StreamableFile,
} from '@nestjs/common';

import { isObject, isStandardSchema } from '@concepta/nestjs-core';

import { CrudException } from '../exceptions/crud.exception.js';
import { CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface.js';
import { CrudSerializationOptionsInterface } from '../interfaces/crud-serialization-options.interface.js';
import { CrudMetaview } from '../services/crud-metaview.service.js';
import { crudIsPaginatedHelper } from '../utils/crud-is-paginated.helper.js';

type ResponseType =
  | (PlainLiteralObject & CrudResponsePaginatedInterface)
  | Array<PlainLiteralObject>;

@Injectable()
export class CrudSerializeInterceptor<
  T extends PlainLiteralObject = PlainLiteralObject,
> implements NestInterceptor {
  constructor(private reflectionService: CrudMetaview<T>) {}

  /**
   * @internal
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // get the options
    const options = this.getOptions(context);

    // serialize the response — schema-based serialization
    // (this.toSchema) can be async, so resolve uniformly via mergeMap
    // rather than map.
    return next
      .handle()
      .pipe(
        mergeMap((response: ResponseType) =>
          from(Promise.resolve(this.serialize(response, options))),
        ),
      );
  }

  /**
   * @internal
   */
  protected serialize(
    response: ResponseType,
    options: CrudSerializationOptionsInterface,
  ): unknown | Promise<unknown> {
    // reasons to bail
    if (!isObject(response) || response instanceof StreamableFile) {
      // return response untouched
      return response;
    }

    // determine the schema to use
    const schema =
      !Array.isArray(response) && crudIsPaginatedHelper(response) === true
        ? options?.paginated
        : options?.resource;

    // this should never happen, but needed just in case somebody
    // removes the response resource/paginated schema configuration
    if (schema === undefined || !isStandardSchema(schema)) {
      throw new CrudException({
        message: 'Impossible to serialize data without a response schema.',
        fault: 'usage',
      });
    }

    return this.toSchema(schema, response);
  }

  /**
   * Shapes a response through a Zod (Standard Schema) schema — the schema
   * parse strips unknown/underscore-prefixed keys. Fail-closed: our own
   * code returning a shape that doesn't match its DECLARED response schema
   * is a server bug, not a client error, so this throws a `CrudException`
   * (a `RuntimeException`, 500 by default) — never a raw, unnormalized
   * `Error` — matching what `StandardSchemaSerializerInterceptor` would
   * otherwise throw directly.
   */
  protected async toSchema(
    schema: z.ZodType,
    response: ResponseType,
  ): Promise<unknown> {
    const result = await schema['~standard'].validate(response);
    if (result.issues) {
      throw new CrudException({
        message: 'Response failed schema validation: %s',
        messageParams: [result.issues.map((issue) => issue.message).join('; ')],
        originalError: new Error(JSON.stringify(result.issues)),
        fault: 'internal',
      });
    }
    return result.value;
  }

  protected getOptions(
    context: ExecutionContext,
  ): CrudSerializationOptionsInterface {
    const target = context.getClass();
    const handler = context.getHandler();

    // get serialization options — this is the actual stored decorator
    // metadata object (returned by reference, not a copy), so it must
    // never be mutated here; build and return a fresh object instead
    const options = this.reflectionService.getAllSerializationOptions(
      target,
      handler,
    );

    return {
      resource:
        options?.resource ??
        this.reflectionService.getResponseResource(target, handler),
      paginated:
        options?.paginated ??
        this.reflectionService.getResponsePaginated(target, handler),
    };
  }
}
