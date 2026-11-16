import {
  type TypeOrmColumnMetadata,
  type TypeOrmRelationMetadata,
  type TypeOrmInverseRelation,
} from '../../../repository/typeorm-metadata.types.js';

type RelationOverrides = Partial<
  Omit<TypeOrmRelationMetadata, 'inverseRelation' | 'inverseEntityMetadata'>
> & {
  inverseRelation?: TypeOrmInverseRelation;
  inverseEntityMetadata?: {
    name: string;
    /** Defaults to `name`. */
    tableName?: string;
    database?: string;
    columns?: readonly TypeOrmColumnMetadata[];
  };
};

export function mockRelationMetadata(
  overrides: RelationOverrides,
): TypeOrmRelationMetadata {
  const { inverseRelation, inverseEntityMetadata, ...rest } = overrides;
  const name = inverseEntityMetadata?.name ?? 'Unknown';
  return {
    propertyName: 'relation',
    inverseEntityMetadata: {
      name,
      tableName: inverseEntityMetadata?.tableName ?? name,
      database: inverseEntityMetadata?.database,
      columns: inverseEntityMetadata?.columns ?? [],
    },
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
