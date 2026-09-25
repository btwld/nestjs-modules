# Rockets

![Rockets Logo](https://raw.githubusercontent.com/btwld/nestjs-modules/main/assets/rockets-icon.svg)

## Project

[![Codacy](https://app.codacy.com/project/badge/Grade/6b92bb0756ee4664a1403c4688a0d172)](https://www.codacy.com/gh/conceptadev/rockets/dashboard?utm_source=github.com&utm_medium=referral&utm_content=conceptadev/rockets&utm_campaign=Badge_Grade)
[![Code Climate Maint](https://img.shields.io/codeclimate/maintainability/conceptadev/rockets?logo=codeclimate)](https://codeclimate.com/github/conceptadev/rockets)
[![Code Climate Debt](https://img.shields.io/codeclimate/tech-debt/conceptadev/rockets?logo=codeclimate)](https://codeclimate.com/github/conceptadev/rockets)
[![Codecov](https://codecov.io/gh/conceptadev/rockets/branch/main/graph/badge.svg?token=QXUHV1RP5N)](https://codecov.io/gh/conceptadev/rockets)
[![GitHub Build](https://img.shields.io/github/actions/workflow/status/btwld/nestjs-modules/ci-pr-test.yml?logo=github)](https://github.com/btwld/nestjs-modules/actions/workflows/ci-pr-test.yml)
[![GH Commits](https://img.shields.io/github/commit-activity/m/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)

```text
Rapid Enterprise Development Toolkit
```

A collection of NestJS modules
that were created for the rapid development of enterpise level APIs.

All reasonable efforts have been made to provide loosely coupled interfaces,
overridable services, and sane default implementations.

## Contributing

This project is currently in alpha testing, however, feedback is highly
appreciated and encouraged!

Pull requests will be gratefully accepted in the very near future,
once we have finalized our Contributor License Agreement.

## Modules

| Module                                                                                                                           | Summary                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| [nestjs-access-control](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-access-control 'nestjs-access-control') | Advanced access control guard for NestJS with optional per-request filtering.                                                               |
| [nestjs-auth-github](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-auth-github 'nestjs-auth-github')          | Authenticate requests using GitHub oAuth2 sign-on.                                                                                          |
| [nestjs-auth-jwt](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-auth-jwt 'nestjs-auth-jwt')                   | Authenticate requests using JWT tokens passed via the request (headers, cookies, body, query, etc).                                         |
| [nestjs-auth-local](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-auth-local 'nestjs-auth-local')             | Authenticate requests using username/email and password against a local or remote data source.                                              |
| [nestjs-auth-refresh](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-auth-refresh 'nestjs-auth-refresh')       | Authenticate requests using JWT refresh tokens passed via the request (headers, cookies, body, query, etc).                                 |
| [nestjs-authentication](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-authentication 'nestjs-authentication') | Authenticate requests using one or more strategies (local, jwt, etc).                                                                       |
| [nestjs-common](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-common 'nestjs-common')                         | The common module is a dependency of all Rockets modules.                                                                                   |
| [nestjs-crud](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-crud 'nestjs-crud')                               | Extremely powerful CRUD module that is an extension/wrapper of the popular @nestjsx/crud module.                                            |
| [nestjs-email](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-email 'nestjs-email')                            | Email deliver module that supports most popular transports, as well as template based email bodies using handlebars syntax.                 |
| [nestjs-event](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-event 'nestjs-event')                            | Advanced class based event dispatch/listener module.                                                                                        |
| [nestjs-jwt](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-jwt 'nestjs-jwt')                                  | A flexible JWT utilities module for signing and validating tokens.                                                                          |
| [nestjs-logger](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-logger 'nestjs-logger')                         | Drop-in replacement for the core NestJS logger that provides additonal support for pushing log data to external log providers.              |
| [nestjs-password](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-password 'nestjs-password')                   | A flexible Password utilities module that provides services for password strength, creation and storage.                                    |
| [nestjs-swagger-ui](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-swagger-ui 'nestjs-swagger-ui')             | Expose your OpenApi spec on your API using the powerful Swagger UI interface.                                                               |
| [nestjs-typeorm-ext](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-typeorm-ext 'nestjs-typeorm-ext')          | Extension of the NestJS TypeOrm module that allows your dynamic modules to accept drop-in replacements of custom entities and repositories. |
| [nestjs-user](https://github.com/btwld/nestjs-modules/tree/main/packages/nestjs-user 'nestjs-user')                               | A module for managing a basic User entity, including controller with full CRUD, DTOs, sample data factory and seeder.                       |
