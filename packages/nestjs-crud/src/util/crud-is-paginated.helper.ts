import { CrudResponsePaginatedInterface } from '../crud/interfaces/crud-response-paginated.interface';

export function crudIsPaginatedHelper(
  response: object,
): response is CrudResponsePaginatedInterface {
  return (
    'data' in response &&
    Array.isArray(response.data) === true &&
    'count' in response &&
    'total' in response &&
    'page' in response &&
    'pageCount' in response
  );
}
