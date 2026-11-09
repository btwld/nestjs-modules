import { type Type } from '@nestjs/common';

export interface ModuleOptionsControllerInterface {
  controller?: false | Type | Type[];
}
