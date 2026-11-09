import { appendOnlyAggregateSchema } from '../append-only-aggregate.schema.js';
import { auditSchema } from '../audit.schema.js';
import { mutableAggregateSchema } from '../mutable-aggregate.schema.js';
import { referenceIdSchema } from '../reference-id.schema.js';

describe('auditSchema', () => {
  it('accepts valid audit fields, including a null dateDeleted', () => {
    const result = auditSchema.parse({
      dateCreated: new Date('2024-01-01'),
      dateUpdated: new Date('2024-01-02'),
      dateDeleted: null,
    });

    expect(result).toEqual({
      dateCreated: new Date('2024-01-01'),
      dateUpdated: new Date('2024-01-02'),
      dateDeleted: null,
    });
  });

  it('rejects a missing dateDeleted (nullable is required, not optional)', () => {
    const result = auditSchema.safeParse({
      dateCreated: new Date(),
      dateUpdated: new Date(),
    });

    expect(result.success).toBe(false);
  });
});

describe('referenceIdSchema', () => {
  it('accepts a string id', () => {
    expect(referenceIdSchema.parse({ id: 'abc' })).toEqual({ id: 'abc' });
  });

  it('rejects a non-string id', () => {
    expect(referenceIdSchema.safeParse({ id: 123 }).success).toBe(false);
  });
});

describe('mutableAggregateSchema', () => {
  it('merges audit + reference-id + version fields', () => {
    const result = mutableAggregateSchema.parse({
      id: 'abc',
      version: 1,
      dateCreated: new Date('2024-01-01'),
      dateUpdated: new Date('2024-01-02'),
      dateDeleted: null,
    });

    expect(result).toEqual({
      id: 'abc',
      version: 1,
      dateCreated: new Date('2024-01-01'),
      dateUpdated: new Date('2024-01-02'),
      dateDeleted: null,
    });
  });

  it('strips unknown keys (matching the legacy excludeAll/excludeExtraneousValues behavior)', () => {
    const result = mutableAggregateSchema.parse({
      id: 'abc',
      version: 1,
      dateCreated: new Date(),
      dateUpdated: new Date(),
      dateDeleted: null,
      _internal: 'should be stripped',
    });

    expect(result).not.toHaveProperty('_internal');
  });
});

describe('appendOnlyAggregateSchema', () => {
  it('accepts reference-id + dateCreated', () => {
    const result = appendOnlyAggregateSchema.parse({
      id: 'abc',
      dateCreated: new Date('2024-01-01'),
    });

    expect(result).toEqual({ id: 'abc', dateCreated: new Date('2024-01-01') });
  });

  /**
   * An append-only record never changes, so the mutable fields have no place
   * in it.
   */
  it('strips version, dateUpdated and dateDeleted', () => {
    const result = appendOnlyAggregateSchema.parse({
      id: 'abc',
      dateCreated: new Date('2024-01-01'),
      version: 1,
      dateUpdated: new Date(),
      dateDeleted: null,
    });

    expect(result).toEqual({ id: 'abc', dateCreated: new Date('2024-01-01') });
  });

  it('rejects a missing dateCreated', () => {
    expect(appendOnlyAggregateSchema.safeParse({ id: 'abc' }).success).toBe(
      false,
    );
  });
});
