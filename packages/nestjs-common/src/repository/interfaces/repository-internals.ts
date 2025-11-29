/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable tsdoc/syntax */
/* eslint-disable @typescript-eslint/no-namespace */
/**
 * !!! COPIED FROM TYPEORM !!!
 *
 * Some were not copied verbatim due to ridiculousness.
 *
 * These types need to be reduces to the smalles possible interface.
 */

export namespace RepositoryInternals {
  /**
   * A single property handler for FindOptionsOrder.
   */
  export type FindOptionsOrderProperty<Property> =
    Property extends Promise<infer I>
      ? FindOptionsOrderProperty<NonNullable<I>>
      : Property extends Array<infer I>
        ? FindOptionsOrderProperty<NonNullable<I>>
        : Property extends (...args: unknown[]) => unknown
          ? never
          : Property extends string
            ? FindOptionsOrderValue
            : Property extends number
              ? FindOptionsOrderValue
              : Property extends boolean
                ? FindOptionsOrderValue
                : Property extends Date
                  ? FindOptionsOrderValue
                  : Property extends object
                    ? FindOptionsOrder<Property> | FindOptionsOrderValue
                    : FindOptionsOrderValue;
  /**
   * Order by find options.
   */
  export type FindOptionsOrder<Entity> = {
    [P in keyof Entity]?: P extends 'toString'
      ? unknown
      : FindOptionsOrderProperty<NonNullable<Entity[P]>>;
  };
  /**
   * Value of order by in find options.
   */
  export type FindOptionsOrderValue =
    | 'ASC'
    | 'DESC'
    | 'asc'
    | 'desc'
    | 1
    | -1
    | {
        direction?: 'asc' | 'desc' | 'ASC' | 'DESC';
        nulls?: 'first' | 'last' | 'FIRST' | 'LAST';
      };

  /**
   * Defines a special criteria to find specific entity.
   */
  export interface FindOneOptions<Entity = any> {
    /**
     * Simple condition that should be applied to match entities.
     */
    where?: FindOptionsWhere<Entity>[] | FindOptionsWhere<Entity>;
    /**
     * Order, in which entities should be ordered.
     */
    order?: FindOptionsOrder<Entity>;
  }

  /**
   * A single property handler for FindOptionsWhere.
   *
   * The reason why we have both "PropertyToBeNarrowed" and "Property" is that Union is narrowed down when extends is used.
   * It means the result of FindOptionsWhereProperty<1 | 2> doesn't include FindOperator<1 | 2> but FindOperator<1> | FindOperator<2>.
   * So we keep the original Union as Original and pass it to the FindOperator too. Original remains Union as extends is not used for it.
   */
  export type FindOptionsWhereProperty<
    PropertyToBeNarrowed,
    Property = PropertyToBeNarrowed,
  > =
    PropertyToBeNarrowed extends Promise<infer I>
      ? FindOptionsWhereProperty<NonNullable<I>>
      : PropertyToBeNarrowed extends Array<infer I>
        ? FindOptionsWhereProperty<NonNullable<I>>
        : PropertyToBeNarrowed extends (...args: unknown[]) => unknown
          ? never
          : Property;

  /**
   * Used for find operations.
   */
  export type FindOptionsWhere<Entity> = {
    [P in keyof Entity]?: P extends 'toString'
      ? unknown
      : FindOptionsWhereProperty<NonNullable<Entity[P]>>;
  };

  /**
   * Result object returned by UpdateQueryBuilder execution.
   */
  export declare class UpdateResult {
    /**
     * Number of affected rows/documents
     * Not all drivers support this
     */
    affected?: number;
  }

  /**
   * Special options passed to Repository#save, Repository#insert and Repository#update methods.
   */
  export interface SaveOptions {
    /**
     * Additional data to be passed with persist method.
     * This data can be used in subscribers then.
     */
    data?: any;
    /**
     * By default chunk is not applied. To enable chunking, specify chunk size.
     * For example, specifying { chunk: 50 } will execute 50 inserts per chunk.
     */
    chunk?: number;
  }

  /**
   * Defines a special criteria to find specific entities.
   */
  export interface FindManyOptions<Entity = any>
    extends FindOneOptions<Entity> {
    /**
     * Offset (paginated) where from entities should be taken.
     */
    skip?: number;
    /**
     * Limit (paginated) - max number of entities should be taken.
     */
    take?: number;
  }
}
