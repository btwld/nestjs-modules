export { AggregateMetaInterface } from './domain/aggregates/interfaces/aggregate-meta.interface.js';
export { CorrectableInterface } from './domain/aggregates/interfaces/correctable.interface.js';

export { DomainAggregate } from './domain/aggregates/domain-aggregate.js';
export { MutableAggregate } from './domain/aggregates/mutable-aggregate.js';
export { AppendOnlyAggregate } from './domain/aggregates/append-only-aggregate.js';
export { DomainMapper } from './domain/aggregates/domain-mapper.js';

export { mutableAggregateSchema } from './infrastructure/schemas/mutable-aggregate.schema.js';
export { appendOnlyAggregateSchema } from './infrastructure/schemas/append-only-aggregate.schema.js';
