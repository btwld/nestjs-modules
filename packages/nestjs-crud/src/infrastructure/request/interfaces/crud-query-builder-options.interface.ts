export interface CrudQueryBuilderOptionsInterface {
  delim?: string;
  delimStr?: string;
  paramNamesMap?: {
    fields?: string[];
    search?: string[];
    filter?: string[];
    or?: string[];
    sort?: string[];
    limit?: string[];
    offset?: string[];
    page?: string[];
    cache?: string[];
    includeDeleted?: string[];
  };
}
