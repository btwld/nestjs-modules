export function splitSortString(sort: string, delim = ',') {
  const [field, order] = sort.split(delim);
  let sortField: string;
  let relation: string | undefined;

  if (field.includes('.')) {
    const parts = field.split('.');
    [relation, sortField] = parts;
  } else {
    sortField = field;
  }

  return {
    field: sortField ? sortField.trim() : undefined,
    order: order ? order.trim().toUpperCase() : undefined,
    ...(relation ? { relation } : {}),
  };
}
