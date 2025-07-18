import { Body } from '@nestjs/common';

import { CrudValidationOptions } from '../../crud.types';

export interface CrudBodyOptionsInterface {
  validation?: CrudValidationOptions;
  pipes?: Parameters<typeof Body>[1][];
}
