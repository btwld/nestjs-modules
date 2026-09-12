import { OtpModule, otpCreateSchema, Otp } from '../index.js';

describe('index', () => {
  it('should be an instance of Function', () => {
    expect(OtpModule).toBeInstanceOf(Function);
  });

  it('should export otpCreateSchema', () => {
    expect(otpCreateSchema.meta).toBeInstanceOf(Function);
  });

  it('should be an instance of Function', () => {
    expect(Otp).toBeInstanceOf(Function);
  });
});
