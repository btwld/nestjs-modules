import { z } from 'zod';

import {
  standardSchemaConverter,
  withNamedComponent,
  withOpenApi,
} from '../open-api.util.js';

describe(withOpenApi, () => {
  it('attaches a ~standard.jsonSchema extension that does not throw on Date fields', () => {
    const schema = withOpenApi(
      z.object({ createdAt: z.date(), deletedAt: z.date().nullable() }),
    );

    const jsonSchema = schema['~standard'].jsonSchema?.output?.({
      target: 'openapi-3.0',
    });

    expect(jsonSchema).toEqual({
      type: 'object',
      properties: {
        createdAt: { type: 'string', format: 'date-time' },
        deletedAt: { type: 'string', format: 'date-time', nullable: true },
      },
      required: ['createdAt', 'deletedAt'],
      additionalProperties: false,
    });
  });

  it('works without an id (no component registration)', () => {
    const schema = withOpenApi(z.object({ name: z.string() }));

    expect(schema['~standard'].jsonSchema).toBeDefined();
  });
});

describe(withNamedComponent, () => {
  it('registers the schema under the given id, retrievable via .meta()', () => {
    const schema = withNamedComponent(z.object({ name: z.string() }), 'Widget');

    expect(schema.meta()).toEqual({ id: 'Widget' });
  });

  it('throws when the id is already registered to a different schema instance', () => {
    withNamedComponent(z.object({ name: z.string() }), 'DuplicateId');

    expect(() =>
      withNamedComponent(z.object({ other: z.string() }), 'DuplicateId'),
    ).toThrow(/already registered/);
  });
});

describe(standardSchemaConverter, () => {
  it('returns a named $ref + components entry for a registered schema, reused across calls', () => {
    const schema = withNamedComponent(
      z.object({ id: z.string(), name: z.string() }),
      'WidgetResponse',
    );

    const first = standardSchemaConverter(schema, { schemaType: 'output' });
    const second = standardSchemaConverter(schema, { schemaType: 'output' });

    expect(first?.schema).toEqual({
      $ref: '#/components/schemas/WidgetResponse',
    });
    expect(second?.schema).toEqual({
      $ref: '#/components/schemas/WidgetResponse',
    });
    expect(first?.components).toHaveProperty('WidgetResponse');
  });

  it('hoists a nested named component into its own components entry, with the $ref rewritten', () => {
    const categorySchema = withNamedComponent(
      z.object({ id: z.string() }),
      'Category',
    );
    const petSchema = withNamedComponent(
      z.object({ id: z.string(), category: categorySchema }),
      'Pet',
    );

    const result = standardSchemaConverter(petSchema, { schemaType: 'output' });

    // The Pet component body must NOT retain an embedded $defs/definitions
    // block (invalid OpenAPI 3.0) — Category must be hoisted to its own
    // top-level components entry instead.
    expect(result?.components?.Pet).not.toHaveProperty('$defs');
    expect(result?.components?.Pet).not.toHaveProperty('definitions');
    expect(result?.components).toHaveProperty('Category');
  });

  it('falls through (returns undefined) for an unregistered schema', () => {
    const schema = withOpenApi(z.object({ name: z.string() }));

    expect(
      standardSchemaConverter(schema, { schemaType: 'input' }),
    ).toBeUndefined();
  });

  it('returns undefined for a non-Standard-Schema value', () => {
    expect(
      standardSchemaConverter({ notASchema: true }, { schemaType: 'input' }),
    ).toBeUndefined();
  });
});
