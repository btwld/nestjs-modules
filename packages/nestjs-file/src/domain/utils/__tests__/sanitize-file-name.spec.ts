import {
  FILE_NAME_MAX_LENGTH,
  sanitizeFileName,
} from '../sanitize-file-name.js';

describe(sanitizeFileName.name, () => {
  it('keeps a plain name as it is', () => {
    expect(sanitizeFileName('insurance certificate.pdf')).toEqual(
      'insurance certificate.pdf',
    );
  });

  it.each([
    ['docs/a.pdf', 'a.pdf'],
    ['../../etc/passwd', 'passwd'],
    ['C:\\Users\\me\\a.pdf', 'a.pdf'],
    ['/abs/path/a.pdf', 'a.pdf'],
  ])('drops the path from %j', (input, expected) => {
    expect(sanitizeFileName(input)).toEqual(expected);
  });

  it.each([
    ['nul byte', 'a\u0000.pdf', 'a.pdf'],
    ['newline', 'a\n.pdf', 'a.pdf'],
    ['right-to-left override', 'invoice\u202Efdp.exe', 'invoicefdp.exe'],
    ['zero-width space', 'a\u200B.pdf', 'a.pdf'],
    ['line separator', 'a\u2028.pdf', 'a.pdf'],
  ])('strips a %s', (_label, input, expected) => {
    expect(sanitizeFileName(input)).toEqual(expected);
  });

  it('strips a control character hiding a path separator', () => {
    expect(sanitizeFileName('..\u0000/a.pdf')).toEqual('a.pdf');
  });

  it('keeps the zero-width non-joiner and joiner', () => {
    const nonJoiner = String.fromCodePoint(0x200c);
    const joiner = String.fromCodePoint(0x200d);
    const name = `a${nonJoiner}b${joiner}c.pdf`;

    expect(sanitizeFileName(name)).toEqual(name);
  });

  it('strips a lone surrogate', () => {
    expect(sanitizeFileName('a\uD800.pdf')).toEqual('a.pdf');
  });

  it('normalises to NFC', () => {
    expect(sanitizeFileName('cafe\u0301.pdf')).toEqual('caf\u00E9.pdf');
  });

  it('normalises after stripping, so a stripped character cannot split a composition', () => {
    expect(sanitizeFileName('cafe\u200B\u0301.pdf')).toEqual('caf\u00E9.pdf');
  });

  it('trims a long run of dots in linear time', () => {
    const started = performance.now();

    // Capped to its extension: the stem is all dots.
    expect(sanitizeFileName(`${'.'.repeat(100_000)}x`)).toEqual('.x');
    // A backtracking trim takes over 4 seconds here.
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('trims surrounding whitespace and trailing dots', () => {
    expect(sanitizeFileName('  a.pdf. . ')).toEqual('a.pdf');
  });

  it.each(['..', '.', 'uploads/', 'uploads/..', ' \u202E ', ''])(
    'leaves nothing of %j',
    (input) => {
      expect(sanitizeFileName(input)).toEqual('');
    },
  );

  it('caps a long name, keeping its extension', () => {
    const name = sanitizeFileName(`${'a'.repeat(300)}.pdf`);

    expect(Array.from(name)).toHaveLength(FILE_NAME_MAX_LENGTH);
    expect(name).toEqual(`${'a'.repeat(FILE_NAME_MAX_LENGTH - 4)}.pdf`);
  });

  it('caps in code points, never splitting a surrogate pair', () => {
    const name = sanitizeFileName('\u{1F600}'.repeat(300));

    expect(name).toEqual('\u{1F600}'.repeat(FILE_NAME_MAX_LENGTH));
  });

  it('caps a name whose extension is too long to keep', () => {
    const name = sanitizeFileName(`a.${'b'.repeat(300)}`);

    expect(name).toEqual(`a.${'b'.repeat(FILE_NAME_MAX_LENGTH - 2)}`);
  });

  it('keeps an extension of 32 code points, dot included', () => {
    const extension = `.${'e'.repeat(31)}`;
    const name = sanitizeFileName(`${'a'.repeat(300)}${extension}`);

    expect(name).toEqual(
      `${'a'.repeat(FILE_NAME_MAX_LENGTH - 32)}${extension}`,
    );
  });

  it('drops an extension of 33 code points', () => {
    const name = sanitizeFileName(`${'a'.repeat(300)}.${'e'.repeat(32)}`);

    expect(name).toEqual('a'.repeat(FILE_NAME_MAX_LENGTH));
  });

  it('keeps the tail when the capped head is only dots', () => {
    const name = sanitizeFileName(`${'.'.repeat(255)}${'a'.repeat(40)}`);

    expect(name).toEqual(`${'.'.repeat(215)}${'a'.repeat(40)}`);
  });

  it('trims a trailing dot the cap exposes', () => {
    const name = sanitizeFileName(`${'a'.repeat(254)}.${'b'.repeat(40)}`);

    expect(name).toEqual('a'.repeat(254));
  });
});
