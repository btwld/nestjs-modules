# Rockets NestJS Swagger UI

Expose your OpenApi spec on your API using the powerful Swagger UI interface.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-swagger-ui)](https://www.npmjs.com/package/@concepta/nestjs-swagger-ui)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-swagger-ui)](https://www.npmjs.com/package/@concepta/nestjs-swagger-ui)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Overview

The Swagger UI module provides a simple implementation of the
[@nestjs/swagger](https://www.npmjs.com/package/@nestjs/swagger) module.

Using this module, you can register the Swagger UI just like a normal module
to reduce the amount of boilerplate in your main.ts.

## Installation

`yarn add @concepta/nestjs-swagger-ui`

## Usage

app.module.ts

```ts
@Module({
  imports: [
    SwaggerUiModule.register({
      settings: {
        path: 'api',
        basePath: '/v1',
      },
    }),
  ],
})
export class AppModule {}
```

main.ts

```ts
async function bootstrap() {
  // create app
  const app = await NestFactory.create(AppModule);
  // get the swagger ui service
  const swaggerUiService = app.get(SwaggerUiService);
  // set it up
  swaggerUiService.setup(app);
  // start listening
  await app.listen(3000);
}
bootstrap();
```

## Configuration

All of the options in the official docs for
[NestJS OpenApi](https://docs.nestjs.com/openapi) are supported.

To see how they are mapped to the registration options `settings` property,
see the [SwaggerUiSettingsInterface](https://github.com/btwld/nestjs-modules/blob/main/packages/nestjs-swagger-ui/src/interfaces/swagger-ui-settings.interface.ts)
