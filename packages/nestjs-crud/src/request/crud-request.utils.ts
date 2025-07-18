import { COMPARISON_OPERATORS } from './crud-request-query.contants';
import { ComparisonOperator } from './types/crud-request-query.types';

export function isComparisonOperator(
  operator: string,
): operator is ComparisonOperator {
  const found = COMPARISON_OPERATORS.find(
    (validOperator) => operator === validOperator,
  );
  return found !== undefined;
}

export function comparisonOperatorKeys(
  obj: Record<string, unknown>,
): ComparisonOperator[] {
  return Object.keys(obj).filter((key: string): key is ComparisonOperator =>
    isComparisonOperator(key),
  );
}
