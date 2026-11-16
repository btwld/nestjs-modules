import { z } from 'zod';
import { createStandardJSONSchemaMethod } from 'zod/v4/core';

import { type StandardSchemaConverter } from '@nestjs/swagger';

/**
 * Shared JSON Schema conversion options for every schema built through
 * `withOpenApi`. `unrepresentable: 'any'` avoids a hard throw for
 * `z.date()` (Date has no native JSON Schema representation); the
 * `override` then fills in the OpenAPI-3.0 shape `@ApiProperty` used to
 * produce for date fields, so `z.date()`/`z.date().nullable()` can be
 * used directly in schemas with no per-field wrapper.
 */
const jsonSchemaLibraryOptions = {
  unrepresentable: 'any' as const,
  override: (ctx: {
    zodSchema: z.ZodType;
    jsonSchema: Record<string, unknown>;
  }) => {
    if (ctx.zodSchema instanceof z.ZodDate) {
      ctx.jsonSchema.type = 'string';
      ctx.jsonSchema.format = 'date-time';
    }
  },
};

type JsonSchemaConversionParams = Parameters<
  ReturnType<typeof createStandardJSONSchemaMethod>
>[0];
type JsonSchema = ReturnType<ReturnType<typeof createStandardJSONSchemaMethod>>;

/**
 * Wraps `createStandardJSONSchemaMethod`'s returned function so
 * `jsonSchemaLibraryOptions` (the date override, in particular) always
 * applies — including when the CALLER never supplies `libraryOptions`
 * itself. This matters because `@nestjs/swagger` calls
 * `schema['~standard'].jsonSchema[type]({ target: 'openapi-3.0' })`
 * directly with no `libraryOptions`, for any schema that falls through to
 * this native path (i.e. every schema NOT registered via
 * `withNamedComponent`, e.g. an inline request body schema).
 *
 * A caller-supplied `libraryOptions` fully replaces (not merges into) the
 * date override below; no current caller passes one.
 */
function bridgedJsonSchemaMethod(schema: z.ZodType, io: 'input' | 'output') {
  const generate = createStandardJSONSchemaMethod(schema, io);
  return (params?: JsonSchemaConversionParams) =>
    generate({
      target: params?.target ?? 'draft-2020-12',
      libraryOptions: {
        ...jsonSchemaLibraryOptions,
        ...params?.libraryOptions,
      },
    });
}

/**
 * Type guard narrowing an `unknown` value to a Zod (Standard Schema) schema
 * — e.g. swagger's parameter/response converters, which receive arbitrary
 * values and must confirm a schema before converting it.
 */
export function isStandardSchema(value: unknown): value is z.ZodType {
  return !!value && typeof value === 'object' && '~standard' in value;
}

/**
 * Attaches the `~standard.jsonSchema` extension (per the `StandardJSONSchemaV1`
 * spec) to a Zod schema, bridging it to Zod v4's `toJSONSchema`. This is
 * what lets `@nestjs/swagger`'s native Standard Schema conversion path
 * (and our own `standardSchemaConverter` below, for its fallback case)
 * render a Zod schema as OpenAPI.
 *
 * IMPORTANT: `schema.meta(...)` clones and returns a NEW schema instance
 * (like Zod's other builder methods) — it does not mutate `schema` in
 * place. Always use the RETURN value of `withOpenApi`, never the schema
 * passed in.
 */
export function withOpenApi<T extends z.ZodType>(schema: T, id?: string): T {
  const named = id ? schema.meta({ id }) : schema;
  Object.assign(named['~standard'], {
    jsonSchema: {
      input: bridgedJsonSchemaMethod(named, 'input'),
      output: bridgedJsonSchemaMethod(named, 'output'),
    },
  });
  return named;
}

/**
 * Process-wide registry of schemas that should render as NAMED, reusable
 * `components.schemas` entries (the equivalent of the legacy
 * `ApiExtraModels`/`getSchemaPath` DTO-class dedup) rather than being
 * inlined at every call site. A schema converted alone via the native
 * `~standard.jsonSchema` path always inlines as the JSON Schema root, even
 * with an `id` registered — `$defs`/`id` extraction only happens for
 * schemas nested inside a single conversion call, never for that call's
 * own top-level schema. Named, cross-endpoint `$ref` reuse therefore
 * requires the document-level `standardSchemaConverter` below.
 */
const namedSchemaRegistry = new Map<string, z.ZodType>();

/**
 * Marks a schema as a named, reusable OpenAPI component (e.g. `Cache`,
 * `Pet`). Every endpoint referencing this exact schema instance will
 * `$ref` the same `components.schemas` entry. Call this exactly once per
 * id, at module scope, to build the exported schema constant.
 *
 * Throws if `id` is already registered — this registry is process-wide
 * across all 13 packages, so a naming collision would otherwise silently
 * degrade the FIRST schema registered under that id to an inline shape
 * (see `standardSchemaConverter`'s identity check) instead of failing
 * loudly at module-load time.
 *
 * Must be used on the RETURN value, same caveat as `withOpenApi`.
 */
export function withNamedComponent<T extends z.ZodType>(
  schema: T,
  id: string,
): T {
  if (namedSchemaRegistry.has(id)) {
    throw new Error(`OpenAPI component id "${id}" is already registered.`);
  }
  const named = withOpenApi(schema, id);
  namedSchemaRegistry.set(id, named);
  return named;
}

type JsonSchemaWithDefs = JsonSchema & {
  $defs?: Record<string, JsonSchema>;
  definitions?: Record<string, JsonSchema>;
};

/**
 * Extracts a converted JSON Schema's own `$defs`/`definitions` block (the
 * shapes of schemas NESTED inside this one) so they can be hoisted into
 * the document's `components.schemas` as their own entries, rather than
 * left embedded — which is both invalid OpenAPI 3.0 and would leave any
 * `$ref` pointing at them dangling. `@nestjs/swagger` already rewrites the
 * `$ref` POINTERS themselves (`#/$defs/X` → `#/components/schemas/X`);
 * hoisting the definition BODIES to match is on us.
 */
function extractNestedComponents(rawSchema: JsonSchemaWithDefs): {
  schema: JsonSchema;
  nestedComponents: Record<string, JsonSchema>;
} {
  const { $defs, definitions, ...schema } = rawSchema;
  return {
    schema,
    nestedComponents: { ...$defs, ...definitions },
  };
}

/**
 * Document-level Standard Schema → OpenAPI converter for
 * `SwaggerModule.createDocument(app, config, { standardSchemaConverter })`.
 *
 * For schemas registered via `withNamedComponent`, returns a `$ref` to a
 * named `components.schemas` entry (reused identically across every
 * endpoint that references the same schema instance), with any nested
 * named components it references hoisted alongside it. For any other
 * schema, returns `undefined` so `@nestjs/swagger` falls through to the
 * native `~standard.jsonSchema` path (inline, anonymous shape) — this
 * fallback path is what documents request bodies passed via
 * `@Body({ schema })` automatically, with no decorator needed.
 */
export const standardSchemaConverter: StandardSchemaConverter = (
  schema,
  { schemaType },
) => {
  if (!isStandardSchema(schema)) {
    return undefined;
  }
  const id = schema.meta()?.id;
  if (!id || namedSchemaRegistry.get(id) !== schema) {
    return undefined;
  }
  const convert = schema['~standard'].jsonSchema?.[schemaType];
  const raw = convert?.({ target: 'openapi-3.0' });
  if (!raw) {
    return undefined;
  }
  const { schema: withoutDefs, nestedComponents } =
    extractNestedComponents(raw);
  return {
    schema: { $ref: `#/components/schemas/${id}` },
    components: { ...nestedComponents, [id]: withoutDefs },
  };
};
