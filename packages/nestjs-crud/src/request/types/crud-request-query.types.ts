import { PlainLiteralObject } from '@nestjs/common';

import { CrudEntityColumn } from '../../crud.types';

export type QueryFields<T extends PlainLiteralObject> = CrudEntityColumn<T>[];

export type QueryFilter<T extends PlainLiteralObject> = {
  field: CrudEntityColumn<T>;
  operator: ComparisonOperator;
  value?: unknown;
};

export type QueryFilterArr<T extends PlainLiteralObject> = [
  CrudEntityColumn<T>,
  ComparisonOperator,
  unknown?,
];

export type QuerySort<T extends PlainLiteralObject> = {
  field: CrudEntityColumn<T>;
  order: QuerySortOperator;
};

export type QuerySortArr<T extends PlainLiteralObject> = [
  CrudEntityColumn<T>,
  QuerySortOperator,
];

export type QuerySortOperator = 'ASC' | 'DESC';

export enum CondOperator {
  EQUALS = '$eq',
  NOT_EQUALS = '$ne',
  GREATER_THAN = '$gt',
  LOWER_THAN = '$lt',
  GREATER_THAN_EQUALS = '$gte',
  LOWER_THAN_EQUALS = '$lte',
  STARTS = '$starts',
  ENDS = '$ends',
  CONTAINS = '$cont',
  EXCLUDES = '$excl',
  IN = '$in',
  NOT_IN = '$notin',
  IS_NULL = '$isnull',
  NOT_NULL = '$notnull',
  BETWEEN = '$between',
  EQUALS_LOW = '$eqL',
  NOT_EQUALS_LOW = '$neL',
  STARTS_LOW = '$startsL',
  ENDS_LOW = '$endsL',
  CONTAINS_LOW = '$contL',
  EXCLUDES_LOW = '$exclL',
  IN_LOW = '$inL',
  NOT_IN_LOW = '$notinL',
}

export type ComparisonOperator = keyof SFieldOperator;

// new search
export type SPrimitivesVal = string | number | boolean;

export type SFieldValues = SPrimitivesVal | Array<SPrimitivesVal>;

export type SFieldOperator = {
  $eq?: SFieldValues;
  $ne?: SFieldValues;
  $gt?: SFieldValues;
  $lt?: SFieldValues;
  $gte?: SFieldValues;
  $lte?: SFieldValues;
  $starts?: SFieldValues;
  $ends?: SFieldValues;
  $cont?: SFieldValues;
  $excl?: SFieldValues;
  $in?: SFieldValues;
  $notin?: SFieldValues;
  $between?: SFieldValues;
  $isnull?: SFieldValues;
  $notnull?: SFieldValues;
  $eqL?: SFieldValues;
  $neL?: SFieldValues;
  $startsL?: SFieldValues;
  $endsL?: SFieldValues;
  $contL?: SFieldValues;
  $exclL?: SFieldValues;
  $inL?: SFieldValues;
  $notinL?: SFieldValues;
  $or?: SFieldOperator;
  $and?: never;
};

export type SField = SPrimitivesVal | SFieldOperator;

export type SFields<T extends PlainLiteralObject> = Partial<
  Record<
    CrudEntityColumn<T>,
    SField | Array<SFields<T> | SConditionAND<T>> | undefined | null
  >
> & {
  $or?: Array<SCondition<T>>;
  $and?: never;
};

export type SConditionAND<T extends PlainLiteralObject> = {
  [key: string]: unknown;
  $and?: Array<SCondition<T>>;
  $or?: never;
};

export type SConditionKey = '$and' | '$or';

export type SCondition<T extends PlainLiteralObject> =
  | SFields<T>
  | SConditionAND<T>;
