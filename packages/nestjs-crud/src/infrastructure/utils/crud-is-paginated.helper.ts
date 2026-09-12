import { type CrudResponsePaginatedInterface } from '../interfaces/crud-response-paginated.interface.js';

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
