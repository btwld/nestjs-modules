import {
  type RuntimeException,
  type RuntimeExceptionOptions,
} from '@concepta/nestjs-common';

import { ReportException } from './report.exception';

export class ReportGeneratorServiceNotFoundException extends ReportException {
  context: RuntimeException['context'] & {
    generatorServiceName: string;
  };

  constructor(generatorServiceName: string, options?: RuntimeExceptionOptions) {
    super({
      message: 'Report generator service %s was not registered to be used.',
      messageParams: [generatorServiceName],
      ...options,
    });

    this.errorCode = 'REPORT_GENERATOR_SERVICE_NOT_FOUND_ERROR';

    this.context = {
      ...this.context,
      generatorServiceName,
    };
  }
}
