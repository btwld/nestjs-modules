import { type DocumentBuilder } from '@nestjs/swagger';

import { type SwaggerUiSettingsInterface } from './swagger-ui-settings.interface';

export interface SwaggerUiOptionsInterface {
  settings?: SwaggerUiSettingsInterface;
  documentBuilder?: DocumentBuilder;
}
