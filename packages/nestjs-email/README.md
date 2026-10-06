# Rockets NestJS Email

![Email Documentation](https://img.shields.io/badge/Email-Documentation-blue?logo=mailchimp)

Email deliver module that supports the popular
[@nestjs-modules/mailer](https://www.npmjs.com/package/@nestjs-modules/mailer) module.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-email)](https://www.npmjs.com/package/@concepta/nestjs-email)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-email)](https://www.npmjs.com/package/@concepta/nestjs-email)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Installation

`yarn add @concepta/nestjs-email`

`yarn add @nestjs-modules/mailer handlebars`

## Tutorial

### Configuring Email Settings

First, let's configure the email settings required for the verification system.
Create a configuration file to set up the mailer options.

```ts
// config/mailer.config.ts
import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { registerAs } from '@nestjs/config';

export const mailerConfig = registerAs(
  'MAILER_CONFIG',
  (): MailerOptions => ({
    transport: {
      host: process.env?.MAILGUN_SMTP_SERVER ?? 'smtp.mailgun.org',
      port: process.env?.MAILGUN_SMTP_PORT
        ? Number(process.env?.MAILGUN_SMTP_PORT)
        : 587,
      auth: {
        user: process.env?.MAILGUN_SMTP_LOGIN ?? '',
        pass: process.env?.MAILGUN_SMTP_PASSWORD ?? '',
      },
    },
    defaults: {
      from: process.env?.NODEMAILER_FROM_EMAIL ?? 'no-reply@email.com',
    },
    template: {
      dir: `${__dirname}/../${
        process.env?.NODEMAILER_TEMPLATE_PATH ?? 'assets/templates/email'
      }`,
      adapter: new HandlebarsAdapter(),
      options: {
        strict: true,
      },
    },
  }),
);
```

### Initializing Modules

Initialize the `EmailModule` and `MailerModule` in your application:

```ts
import { MailerModule, MailerService } from '@nestjs-modules/mailer';
import { mailerConfig } from './config/mailer.config';
import { EmailModule } from '@concepta/nestjs-email';

// ...
ConfigModule.forRoot({
  isGlobal: true,
  load: [
    //...
    mailerConfig,
  ],
}),
MailerModule.forRootAsync({
  inject: [mailerConfig.KEY],
  useFactory: async (config: ConfigType<typeof mailerConfig>) => config,
}),
EmailModule.forRootAsync({
  inject: [MailerService],
  useFactory: (mailerService: MailerService) => ({ mailerService }),
}),
// ...
```
