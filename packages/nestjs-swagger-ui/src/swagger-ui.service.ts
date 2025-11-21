import { INestApplication, Inject, Injectable } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { SwaggerUiSettingsInterface } from './interfaces/swagger-ui-settings.interface';
import {
  SWAGGER_UI_MODULE_SETTINGS_TOKEN,
  SWAGGER_UI_MODULE_DOCUMENT_BUILDER_TOKEN,
} from './swagger-ui.constants';

@Injectable()
export class SwaggerUiService {
  /**
   * Constructor.
   *
   * @param settings - swagger ui settings
   * @param documentBuilder - dcument builder instance
   */
  constructor(
    @Inject(SWAGGER_UI_MODULE_SETTINGS_TOKEN)
    protected readonly settings: SwaggerUiSettingsInterface,
    @Inject(SWAGGER_UI_MODULE_DOCUMENT_BUILDER_TOKEN)
    protected readonly documentBuilder: DocumentBuilder,
  ) {}

  /**
   * Returns document builder instance.
   */
  builder(): DocumentBuilder {
    return this.documentBuilder;
  }

  /**
   * Setup.
   *
   * @param app - Nest application instance
   */
  setup(app: INestApplication) {
    // create the document
    const document = SwaggerModule.createDocument(
      app,
      this.documentBuilder.build(),
      this.settings?.documentOptions,
    );

    // finally, set it up
    SwaggerModule.setup(
      this.settings.path,
      app,
      document,
      this.settings?.customOptions,
    );
  }
}
