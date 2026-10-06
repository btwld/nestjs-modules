import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { OtpRepositoryResolverInterface } from '../../domain/repositories/otp-repository-resolver.interface.js';
import { OtpRepositoryInterface } from '../../domain/repositories/otp-repository.interface.js';
import { OtpEntityNotFoundException } from '../exceptions/otp-entity-not-found.exception.js';
import { getDynamicOtpRepositoryToken } from '../utils/create-otp-repository-provider.js';

@Injectable()
export class OtpRepositoryResolver implements OtpRepositoryResolverInterface {
  constructor(private readonly moduleRef: ModuleRef) {}

  resolve(entityKey: string): OtpRepositoryInterface {
    const token = getDynamicOtpRepositoryToken(entityKey);

    try {
      return this.moduleRef.get<OtpRepositoryInterface>(token, {
        strict: false,
      });
    } catch (error) {
      throw new OtpEntityNotFoundException(entityKey, {
        originalError: error,
      });
    }
  }
}
