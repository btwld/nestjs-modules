import {
  type SwaggerCustomOptions,
  type SwaggerDocumentOptions,
} from '@nestjs/swagger';

export interface SwaggerUiSettingsInterface {
  // ui
  path: string;
  documentOptions?: SwaggerDocumentOptions;
  customOptions?: SwaggerCustomOptions;
  // document builder
  title?: string;
  description?: string;
  version?: string;
  termsOfService?: string;
  contact?: { name: string; url: string; email: string };
  license?: { name: string; url: string };
  basePath?: string;
}
