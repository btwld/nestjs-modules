import { type Type } from '@nestjs/common';

import { type AccessControlServiceInterface } from '../ports/access-control-service.interface.js';

export interface AccessControlMetadataInterface {
  service?: Type<AccessControlServiceInterface>;
}
