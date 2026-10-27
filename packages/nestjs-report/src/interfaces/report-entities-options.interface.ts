import {
  type ReportEntityInterface,
  type RepositoryEntityOptionInterface,
} from '@concepta/nestjs-common';

import { type REPORT_MODULE_REPORT_ENTITY_KEY } from '../report.constants';

export interface ReportEntitiesOptionsInterface {
  [REPORT_MODULE_REPORT_ENTITY_KEY]: RepositoryEntityOptionInterface<ReportEntityInterface>;
}
