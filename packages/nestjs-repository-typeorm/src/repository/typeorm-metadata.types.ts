/**
 * Minimal structural interfaces for TypeORM internal metadata types.
 *
 * TypeORM's ColumnMetadata and RelationMetadata are not part of the public API
 * and are only accessible via deep subpath imports that are not compatible with
 * all moduleResolution strategies. These structural interfaces describe only the
 * properties accessed by this package — TypeORM's runtime objects satisfy them.
 */

/**
 * Join column shape as used for FK/PK column metadata.
 */
export interface TypeOrmJoinColumnMetadata {
  readonly propertyName: string;
  readonly referencedColumn?: { readonly propertyName: string };
}

/**
 * Minimal shape of TypeORM's ColumnMetadata used by this package.
 */
export interface TypeOrmColumnMetadata {
  readonly propertyName: string;
  readonly isPrimary: boolean;
  readonly isDeleteDate: boolean;
  readonly isVersion: boolean;
}

/**
 * Minimal shape of the inverse-relation properties accessed by this package.
 * Only the fields that mapNonOwning / mapManyToManyNonOwner actually read are
 * required here — this lets test mocks supply partial objects.
 */
export interface TypeOrmInverseRelation {
  readonly joinColumns: readonly TypeOrmJoinColumnMetadata[];
  readonly inverseJoinColumns?: readonly TypeOrmJoinColumnMetadata[];
  readonly junctionEntityMetadata?: { readonly name: string };
}

/**
 * Minimal shape of TypeORM's RelationMetadata used by this package.
 */
export interface TypeOrmRelationMetadata {
  readonly propertyName: string;
  readonly inverseEntityMetadata: { readonly name: string };
  readonly isOneToMany: boolean;
  readonly isManyToMany: boolean;
  readonly isManyToManyOwner: boolean;
  readonly isOwning: boolean;
  readonly joinColumns: readonly TypeOrmJoinColumnMetadata[];
  readonly inverseJoinColumns: readonly TypeOrmJoinColumnMetadata[];
  readonly junctionEntityMetadata?: { readonly name: string };
  readonly inverseRelation?: TypeOrmInverseRelation;
}
