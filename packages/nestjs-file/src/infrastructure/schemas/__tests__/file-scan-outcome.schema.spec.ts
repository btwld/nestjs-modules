import { FILE_SCAN_RESULTS } from '../../../domain/interfaces/file-scan-result.type.js';
import { fileScanOutcomeSchema } from '../file-scan-outcome.schema.js';

describe('fileScanOutcomeSchema', () => {
  it.each(FILE_SCAN_RESULTS)('accepts a %s result', (result) => {
    expect(fileScanOutcomeSchema.parse({ attempt: 1, result })).toEqual({
      attempt: 1,
      result,
    });
  });

  it('accepts the rescan attempt', () => {
    expect(
      fileScanOutcomeSchema.parse({ attempt: 2, result: 'clean' }),
    ).toEqual({ attempt: 2, result: 'clean' });
  });

  it.each([
    ['an attempt sent as a string', { attempt: '1', result: 'clean' }],
    ['a third attempt', { attempt: 3, result: 'clean' }],
    ['an unknown result', { attempt: 1, result: 'safe' }],
    ['a missing result', { attempt: 1 }],
  ])('rejects %s', (_label, body) => {
    expect(() => fileScanOutcomeSchema.parse(body)).toThrow();
  });
});
