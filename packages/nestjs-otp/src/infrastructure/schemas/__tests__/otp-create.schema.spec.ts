import { otpCreateSchema } from '../otp-create.schema.js';

const validCreate = {
  category: 'test-category',
  type: 'uuid',
  expiresIn: '1h',
  assigneeId: 'test-assignee',
};

describe('otpCreateSchema', () => {
  it('accepts a valid create payload', () => {
    expect(otpCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('accepts rateSeconds/rateThreshold when provided', () => {
    const payload = { ...validCreate, rateSeconds: 60, rateThreshold: 3 };
    expect(otpCreateSchema.parse(payload)).toEqual(payload);
  });

  it('accepts rateSeconds/rateThreshold omitted', () => {
    expect(otpCreateSchema.parse(validCreate)).toEqual(validCreate);
  });

  it('rejects a negative rateSeconds', () => {
    expect(
      otpCreateSchema.safeParse({ ...validCreate, rateSeconds: -1 }).success,
    ).toBe(false);
  });

  it('rejects a rateThreshold below 1', () => {
    expect(
      otpCreateSchema.safeParse({ ...validCreate, rateThreshold: 0 }).success,
    ).toBe(false);
  });

  it('rejects a missing expiresIn', () => {
    const { expiresIn: _expiresIn, ...rest } = validCreate;
    expect(otpCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a missing assigneeId', () => {
    const { assigneeId: _assigneeId, ...rest } = validCreate;
    expect(otpCreateSchema.safeParse(rest).success).toBe(false);
  });

  it('strips unknown keys', () => {
    const result = otpCreateSchema.parse({ ...validCreate, _internal: 'x' });
    expect(result).not.toHaveProperty('_internal');
  });
});
