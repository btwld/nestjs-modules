import { MetadataScanner } from '@nestjs/core';
import { ApiBody, type ApiBodyOptions } from '@nestjs/swagger';

import { Operation } from '@concepta/nestjs-core';

import { type CrudSchema, type MethodHandler } from '../../../crud.types.js';
import { CrudException } from '../../exceptions/crud.exception.js';
import { CrudMetaview } from '../../services/crud-metaview.service.js';
import { swagger } from '../../utils/swagger.helper.js';

/**
 * `standardSchema` isn't declared on `@nestjs/swagger`'s `ApiBodyOptions`
 * (12.0.0-alpha.2) the way it already is on `ApiResponseMetadata`, but
 * `SchemaObjectFactory.getSchemaOverride` reads `param.standardSchema` at
 * document-build time regardless — the same mechanism `apply-api-response.decorator.ts`
 * already relies on for responses. This local intersection keeps the call
 * cast-free; a `swagger.spec.ts`/`petstore.spec.ts` assertion guards against a
 * future alpha silently dropping the key.
 */
type ApiBodyOptionsWithStandardSchema = ApiBodyOptions & {
  standardSchema: CrudSchema;
};

/**
 * Discovers the Reflect metadata key that `@ApiBody()` uses to store
 * parameter descriptors on a route handler. Rather than depending on the
 * private `DECORATORS` constant inside nestjs/swagger (which is a string
 * constant, not a symbol), we apply `@ApiBody` to a probe function and read
 * back which string key it wrote — guaranteeing we use the exact same key
 * that the decorator itself uses, with no dependency on internal APIs.
 *
 * Returns `undefined` when swagger is not installed.
 */
function discoverApiParametersKey(): string | undefined {
  if (!swagger) return undefined;
  // Apply @ApiBody to a probe function and observe which Reflect key it adds.
  const probe = function probe() {};
  const descriptor: PropertyDescriptor = {
    value: probe,
    writable: true,
    enumerable: false,
    configurable: true,
  };
  // Object.create(null) → any, satisfies the MethodDecorator target: Object param
  ApiBody({ type: String })(Object.create(null), 'method', descriptor);
  const keys: unknown[] = Reflect.getMetadataKeys(probe) ?? [];
  // @nestjs/swagger uses a string key (e.g. 'swagger/apiParameters'); find it.
  return keys.find((k): k is string => typeof k === 'string');
}

const API_PARAMETERS_KEY: string | undefined = discoverApiParametersKey();

/**
 * Removes any existing body parameter entry this decorator previously wrote
 * to `handler` (an entry with `in` set to `'body'`). `ApiBody()`'s own
 * metadata storage is append-only, and `@nestjs/swagger`'s
 * document-build-time dedup keeps the *first* body entry among duplicates —
 * so without this, a second `ApiBody()` call on the same handler would be
 * silently discarded instead of overriding the first. `CrudInit()` (and
 * therefore this decorator) is documented as re-runnable
 * (`crud-init.decorator.ts`) and genuinely does run twice on the
 * hybrid-builder path (`configurable-crud.builder.ts` re-runs `CrudInit()`
 * on an already-`@CrudController`-decorated class after augmenting it), so
 * this keeps a second run's resolved body — which can differ from the
 * first, e.g. a `@CrudBody`-pinned override — winning
 * instead of being discarded by swagger's first-wins dedup.
 */
function stripExistingBodyEntry(handler: MethodHandler): void {
  if (!API_PARAMETERS_KEY) return;

  const existingParams: unknown[] =
    Reflect.getMetadata(API_PARAMETERS_KEY, handler) ?? [];
  const withoutBody = existingParams.filter(
    (p) =>
      typeof p !== 'object' || p === null || Reflect.get(p, 'in') !== 'body',
  );
  Reflect.defineMetadata(API_PARAMETERS_KEY, withoutBody, handler);
}

/**
 * \@CrudInit() api body decorator.
 *
 * The sole place `@ApiBody()` is ever applied for a CRUD operation —
 * `CrudApiBody` (the operation decorators' `api.body` option) only stores
 * `ApiBodyOptions` metadata, it never calls `@ApiBody()` itself.
 *
 * Resolves the request body schema — preferring a parameter-level
 * `@CrudBody({ schema })` (so a caller pinning the schema on the parameter
 * itself isn't silently overridden by a differing class/method default),
 * then falling back to the metadata hierarchy (method → class) — and
 * applies `@ApiBody({ ...apiBodyOptions, standardSchema })` for each write
 * operation. Passing the schema itself (rather than a pre-converted JSON
 * Schema blob) routes it through the SAME document-level
 * `standardSchemaConverter` responses already use (see
 * `apply-api-response.decorator.ts`), so a schema registered via
 * `withNamedComponent` documents as a `$ref` instead of inlining —
 * dynamically-generated crud controller methods have no `design:paramtypes`
 * reflection metadata for swagger's OWN parameter explorer to pick this up
 * automatically (see parameter-metadata-accessor.js), so it's applied
 * manually here instead.
 *
 * When no schema resolves at all, still applies `api.body` (if set) as a
 * plain `@ApiBody()` so a fully-schemaless body-bearing operation isn't left
 * completely undocumented.
 */
export const CrudInitApiBody = (): ClassDecorator => (classTarget) => {
  /* istanbul ignore if */
  if (!swagger) return;

  const reflectionService = new CrudMetaview();
  const scanner = new MetadataScanner();
  const prototype = classTarget.prototype;

  for (const methodName of scanner.getAllMethodNames(prototype)) {
    const handler = Reflect.get(prototype, methodName);
    const descriptor = Object.getOwnPropertyDescriptor(prototype, methodName);

    if (!descriptor) continue;

    const operation = reflectionService.getOperation(handler);
    if (!operation) continue;

    let hierarchySchema: CrudSchema | undefined;

    switch (operation) {
      case Operation.CreateBatch:
        hierarchySchema = reflectionService.getRequestBodyBatch(
          classTarget,
          handler,
        );
        break;
      case Operation.Create:
      case Operation.Update:
      case Operation.Replace:
        hierarchySchema = reflectionService.getRequestBody(
          classTarget,
          handler,
        );
        break;
      default:
        continue;
    }

    const apiBodyOptions = reflectionService.getApiBodyOptions(handler);

    const crudBodySchema = reflectionService
      .getBodyParamOptions(handler)
      ?.find((metadata) => metadata.schema)?.schema;

    const bodySchema = crudBodySchema ?? hierarchySchema;

    if (!bodySchema) {
      stripExistingBodyEntry(handler);
      ApiBody(apiBodyOptions ?? {})(prototype, methodName, descriptor);
      continue;
    }

    if (!bodySchema['~standard'].jsonSchema?.input) {
      // A schema missing its ~standard.jsonSchema bridge (i.e. never
      // passed through withOpenApi) would otherwise silently produce an
      // undocumented request body — fail loudly instead.
      throw new CrudException({
        message: `Request body schema for "${methodName}" is missing its OpenAPI bridge — wrap it with withOpenApi() before using it as a CRUD request body.`,
        fault: 'usage',
      });
    }

    stripExistingBodyEntry(handler);

    const options: ApiBodyOptionsWithStandardSchema = {
      ...apiBodyOptions,
      required: apiBodyOptions?.required ?? true,
      standardSchema: bodySchema,
    };

    ApiBody(options)(prototype, methodName, descriptor);
  }
};
