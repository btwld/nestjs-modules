# Rockets

![Rockets Logo](https://raw.githubusercontent.com/conceptadev/rockets/main/assets/rockets-icon.svg)

## Project

[![Codacy](https://app.codacy.com/project/badge/Grade/6b92bb0756ee4664a1403c4688a0d172)](https://www.codacy.com/gh/conceptadev/rockets/dashboard?utm_source=github.com&utm_medium=referral&utm_content=conceptadev/rockets&utm_campaign=Badge_Grade)
[![Codecov](https://codecov.io/gh/conceptadev/rockets/branch/main/graph/badge.svg?token=QXUHV1RP5N)](https://codecov.io/gh/conceptadev/rockets)
[![GitHub Build](https://img.shields.io/github/actions/workflow/status/conceptadev/rockets/ci-pr-test.yml?logo=github)](https://github.com/conceptadev/rockets/actions/workflows/ci-pr-test.yml)
[![GH Commits](https://img.shields.io/github/commit-activity/m/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Last Commit](https://img.shields.io/github/last-commit/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets)
[![GH Contrib](https://img.shields.io/github/contributors/conceptadev/rockets?logo=github)](https://github.com/conceptadev/rockets/graphs/contributors)

```text
Rapid Enterprise Development Toolkit
```

A collection of NestJS modules
that were created for the rapid development of enterpise level APIs.

The v8 line is schema-first — native Zod v4 / Standard Schema validation,
serialization, and OpenAPI — on NestJS 12, ESM-only, Node >= 22.

All reasonable efforts have been made to provide loosely coupled interfaces,
overridable services, and sane default implementations.

## Contributing

This project is currently in alpha testing, however, feedback is highly
appreciated and encouraged!

Pull requests will be gratefully accepted in the very near future,
once we have finalized our Contributor License Agreement.

## Modules

| Module                                                                                                                                           | Summary                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [nestjs-core](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-core 'nestjs-core')                                               | Core framework module providing the app context system, DDD base classes, and shared utilities for Rockets modules.  |
| [nestjs-repository](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-repository 'nestjs-repository')                             | Abstract repository adapter layer with transaction management, federation, and repository hook support.              |
| [nestjs-repository-typeorm](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-repository-typeorm 'nestjs-repository-typeorm')     | TypeORM driver for nestjs-repository with entity base classes and where-clause translation.                          |
| [nestjs-crud](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-crud 'nestjs-crud')                                               | Powerful CRUD module with full DDD/CQRS integration, configurable operations, and optional OpenAPI documentation.    |
| [nestjs-cache](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-cache 'nestjs-cache')                                             | Cache management module using DDD/CQRS patterns with pluggable storage and HTTP CRUD gateway.                        |
| [nestjs-otp](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-otp 'nestjs-otp')                                                   | One-time password module supporting multiple OTP categories with rate limiting and expiry management.                |
| [nestjs-role](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-role 'nestjs-role')                                               | Role and role-assignment management module with DDD/CQRS and HTTP CRUD gateway.                                      |
| [nestjs-password](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-password 'nestjs-password')                                   | Password utilities module providing strength validation, hashing, and storage via configurable policy services.      |
| [nestjs-user](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-user 'nestjs-user')                                               | User entity management module with DDD/CQRS, password integration, and optional HTTP CRUD gateway.                   |
| [nestjs-invitation](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-invitation 'nestjs-invitation')                             | Invitation workflow module handling token generation, delivery, acceptance, and revocation via DDD/CQRS.             |
| [nestjs-federated](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-federated 'nestjs-federated')                                 | Federated (OAuth) identity linking module that maps external provider identities to local user accounts.             |
| [nestjs-authentication](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-authentication 'nestjs-authentication')                 | Full-featured authentication module (JWT, local, refresh, recovery, verify, OAuth router) using DDD and CQRS.       |
| [nestjs-access-control](https://github.com/conceptadev/rockets/tree/main/packages/nestjs-access-control 'nestjs-access-control')                 | Advanced access control guard with role-based grants and optional per-request response attribute filtering.          |

## Entry Points

A module's main entry point (`@concepta/nestjs-x`) never requires an
optional peer dependency to load. Anything that does needs its own subpath
entry point instead, so a consumer who never imports that subpath never has
to install the dependency.

| subpath | gated on |
| --- | --- |
| `optional/typeorm` | `typeorm` |
| `optional/seeding` | `@concepta/typeorm-seeding` + `@faker-js/faker` |
| `optional/crud` | `@concepta/nestjs-crud` |

Rules for maintaining this boundary:

1. **The main entry is dependency-free.** Nothing reachable from
   `src/index.ts` may import an optional peer dependency.
2. **One `optional/*` subpath per optional peer**, named after the dep it
   gates. Source file is `src/optional-<name>.ts`, built to
   `dist/optional-<name>.js`.
3. **Every `optional/*` entry has a matching optional peer declaration** —
   the dep appears in `peerDependencies` *and* in `peerDependenciesMeta`
   with `"optional": true`.
4. **A symbol is exported from exactly one entry point.** No re-exporting
   an `optional/*` symbol from `index.ts`.
5. **Canonical source locations:** typeorm entities in
   `src/infrastructure/persistence/typeorm/`, seed factories and seeders in
   `src/infrastructure/seeding/`, CRUD request/handler classes in
   `src/gateways/http/{commands,queries}/{impl,handlers}/`.

`@concepta/nestjs-core/aggregate`, `@concepta/nestjs-core/testing` and
`@concepta/nestjs-repository/testing` are deliberate exceptions — they gate
nothing, they're just alternate entry points into always-available code, so
they don't live under `optional/`.
