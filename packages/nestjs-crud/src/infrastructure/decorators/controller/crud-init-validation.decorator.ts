import { Body, StandardSchemaValidationPipe } from '@nestjs/common';
import { MetadataScanner } from '@nestjs/core';

import { Operation } from '@concepta/nestjs-core';

import { CrudMetaview } from '../../services/crud-metaview.service.js';
import { withEmptyBodyGuard } from '../../utils/crud-empty-body-guard.util.js';

/**
 * Crud initialize validation decorator.
 *
 * Adds a `StandardSchemaValidationPipe` to every parameter called with the
 * `CrudBody` decorator. The schema resolves from `@CrudBody({ schema })`
 * first, falling back to `request.body`/`bodyBatch` resolved through the
 * metadata hierarchy (method → class) — so a controller-level default is
 * validated, not just a docs placeholder left for `@ApiBody` to render
 * (#467). Pipe options come from
 * `metadata.validation`, falling back to the operation-then-controller
 * `@CrudValidate()` hierarchy — so callers can tune pipe behavior via plain
 * options instead of subclassing. `validation: false` disables validation
 * for that body (it is still bound, just unvalidated); a body with no
 * resolvable schema is always bound unvalidated. `metadata.validation`'s
 * own `allowEmpty` (default `true`, no `@CrudValidate()` fallback — see
 * `CrudBodyValidationOptionsInterface`) controls whether an empty (`{}`)
 * body is accepted — see `withEmptyBodyGuard`.
 */
export const CrudInitValidation = (): ClassDecorator => (classTarget) => {
  const reflectionService = new CrudMetaview();
  const scanner = new MetadataScanner();
  const prototype = classTarget.prototype;

  for (const methodName of scanner.getAllMethodNames(prototype)) {
    const handler = Reflect.get(prototype, methodName);

    // get the body param options for this method
    const bodyParamOptions = reflectionService.getBodyParamOptions(handler);
    if (!bodyParamOptions?.length) continue;

    // validation options resolve method-first, then class (per the
    // @CrudValidate contract)
    const fallbackOptions = reflectionService.getValidationOptions(
      classTarget,
      handler,
    );

    // without an explicit @CrudBody({ schema }), fall back to request.body/
    // bodyBatch resolved through the metadata hierarchy (method → class) —
    // the same resolution docs use (see crud-init-api-body.decorator.ts), so
    // a controller-level default is validated, not just documented (#467).
    const operation = reflectionService.getOperation(handler);
    const fallbackSchema =
      operation === Operation.CreateBatch
        ? reflectionService.getRequestBodyBatch(classTarget, handler)
        : reflectionService.getRequestBody(classTarget, handler);

    // loop all metadatas and set up the pipe
    for (const metadata of bodyParamOptions) {
      const { pipes = [], validation = fallbackOptions } = metadata;
      const schema = metadata.schema ?? fallbackSchema;
      const allowEmpty =
        metadata.validation && typeof metadata.validation === 'object'
          ? metadata.validation.allowEmpty
          : undefined;

      if (schema && validation !== false) {
        Body({
          schema: withEmptyBodyGuard(schema, allowEmpty),
          pipes: [
            new StandardSchemaValidationPipe({ ...validation }),
            ...pipes,
          ],
        })(prototype, methodName, metadata.parameterIndex);
        continue;
      }

      // no schema configured, or validation explicitly disabled — still
      // bind the body, just unvalidated.
      Body(...pipes)(prototype, methodName, metadata.parameterIndex);
    }
  }
};
