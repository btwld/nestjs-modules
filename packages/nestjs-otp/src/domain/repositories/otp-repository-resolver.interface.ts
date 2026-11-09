import { type OtpRepositoryInterface } from './otp-repository.interface.js';

export interface OtpRepositoryResolverInterface {
  resolve(entityKey: string): OtpRepositoryInterface;
}
