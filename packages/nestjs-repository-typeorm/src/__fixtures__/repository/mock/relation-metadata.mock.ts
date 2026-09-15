import {
  type TypeOrmRelationMetadata,
  type TypeOrmInverseRelation,
} from '../../../repository/typeorm-metadata.types.js';

type RelationOverrides = Partial<
  Omit<TypeOrmRelationMetadata, 'inverseRelation'>
> & {
  inverseRelation?: TypeOrmInverseRelation;
};

export function mockRelationMetadata(
  overrides: RelationOverrides,
): TypeOrmRelationMetadata {
  const { inverseRelation, ...rest } = overrides;
  return {
    propertyName: 'relation',
    inverseEntityMetadata: { name: 'Unknown' },
    isOneToMany: false,
    isManyToMany: false,
    isManyToManyOwner: false,
    isOwning: false,
    joinColumns: [],
    inverseJoinColumns: [],
    junctionEntityMetadata: undefined,
    inverseRelation,
    ...rest,
  };
}
