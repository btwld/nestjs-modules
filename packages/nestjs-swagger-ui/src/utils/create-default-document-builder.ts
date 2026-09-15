import { DocumentBuilder } from '@nestjs/swagger';

import { type SwaggerUiSettingsInterface } from '../interfaces/swagger-ui-settings.interface';

export function createDefaultDocumentBuilder(
  settings: SwaggerUiSettingsInterface,
): DocumentBuilder {
  const documentBuilder = new DocumentBuilder();

  if (settings?.title) documentBuilder.setTitle(settings.title);

  if (settings?.description)
    documentBuilder.setDescription(settings.description);

  if (settings?.version) documentBuilder.setVersion(settings.version);

  if (settings?.termsOfService)
    documentBuilder.setTermsOfService(settings.termsOfService);

  if (settings?.basePath) documentBuilder.setBasePath(settings.basePath);

  if (settings?.contact) {
    const { name, url, email } = settings.contact;
    documentBuilder.setContact(name, url, email);
  }

  if (settings?.license) {
    const { name, url } = settings.license;
    documentBuilder.setLicense(name, url);
  }

  return documentBuilder;
}
