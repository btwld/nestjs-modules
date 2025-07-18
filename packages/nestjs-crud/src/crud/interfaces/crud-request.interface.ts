import { CrudRequestParsedParamsInterface } from '../../request/interfaces/crud-request-parsed-params.interface';

import { CrudRequestOptionsInterface } from './crud-request-options.interface';

export interface CrudRequestInterface {
  parsed: CrudRequestParsedParamsInterface;
  options: CrudRequestOptionsInterface;
}
