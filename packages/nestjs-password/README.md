# Rockets NestJS Password

A flexible Password utilities module that provides services for password
strength, creation and storage.

## Project

[![NPM Latest](https://img.shields.io/npm/v/@concepta/nestjs-password)](https://www.npmjs.com/package/@concepta/nestjs-password)
[![NPM Downloads](https://img.shields.io/npm/dw/@conceptadev/nestjs-password)](https://www.npmjs.com/package/@concepta/nestjs-password)
[![GH Last Commit](https://img.shields.io/github/last-commit/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules)
[![GH Contrib](https://img.shields.io/github/contributors/btwld/nestjs-modules?logo=github)](https://github.com/btwld/nestjs-modules/graphs/contributors)
[![NestJS Dep](https://img.shields.io/github/package-json/dependency-version/btwld/nestjs-modules/@nestjs/common?label=NestJS&logo=nestjs&filename=packages%2Fnestjs-core%2Fpackage.json)](https://www.npmjs.com/package/@nestjs/common)

## Overview

The module exports three services: `PasswordStrengthService`,
`PasswordCreationService`, and `PasswordStorageService`.

The `PasswordCreationService` uses the `PasswordStrengthService`
internally for check password strength.

## Installation

`yarn add @concepta/nestjs-password`

## TODO

- Make all services overridable at time of registration.
