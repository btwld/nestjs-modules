import { FileUploadPolicyException } from '../../exceptions/file-upload-policy.exception.js';
import { FileUploadPolicyService } from '../file-upload-policy.service.js';

describe(FileUploadPolicyService.name, () => {
  const file = {
    fileName: 'insurance.pdf',
    contentType: 'application/pdf',
    size: 1024,
  };

  function ruleRefused(
    service: FileUploadPolicyService,
    candidate: typeof file,
  ): unknown {
    try {
      service.assertAllowed(candidate);
    } catch (error) {
      return error instanceof FileUploadPolicyException
        ? error.context.rule
        : error;
    }
    return undefined;
  }

  it('allows every file without a policy', () => {
    const service = new FileUploadPolicyService();

    expect(
      ruleRefused(service, {
        fileName: 'x',
        contentType: 'anything/at-all',
        size: Number.MAX_SAFE_INTEGER,
      }),
    ).toBeUndefined();
  });

  describe('contentTypes', () => {
    const service = new FileUploadPolicyService({
      contentTypes: ['Application/PDF', 'image/png'],
    });

    it('allows a listed type, without regard to case', () => {
      expect(
        ruleRefused(service, { ...file, contentType: 'APPLICATION/pdf' }),
      ).toBeUndefined();
    });

    it('refuses an unlisted type', () => {
      expect(
        ruleRefused(service, { ...file, contentType: 'text/html' }),
      ).toEqual('contentType');
    });

    it('refuses a listed type with parameters it was not listed with', () => {
      expect(
        ruleRefused(service, {
          ...file,
          contentType: 'application/pdf; charset=utf-8',
        }),
      ).toEqual('contentType');
    });
  });

  describe('extensions', () => {
    const service = new FileUploadPolicyService({ extensions: ['PDF', 'gz'] });

    it.each(['a.pdf', 'a.PDF', 'archive.tar.gz'])('allows %s', (fileName) => {
      expect(ruleRefused(service, { ...file, fileName })).toBeUndefined();
    });

    it.each(['a.exe', 'a.pdf.exe', 'pdf', '.pdf', 'a'])(
      'refuses %s',
      (fileName) => {
        expect(ruleRefused(service, { ...file, fileName })).toEqual(
          'extension',
        );
      },
    );
  });

  describe('maxSize', () => {
    const service = new FileUploadPolicyService({ maxSize: 1024 });

    it('allows the maximum', () => {
      expect(ruleRefused(service, { ...file, size: 1024 })).toBeUndefined();
    });

    it('refuses one byte over', () => {
      expect(ruleRefused(service, { ...file, size: 1025 })).toEqual('size');
    });

    it('applies a maximum of zero', () => {
      const empty = new FileUploadPolicyService({ maxSize: 0 });

      expect(ruleRefused(empty, { ...file, size: 1 })).toEqual('size');
    });
  });

  it('refuses everything when a list is empty', () => {
    const service = new FileUploadPolicyService({ contentTypes: [] });

    expect(ruleRefused(service, file)).toEqual('contentType');
  });

  it('names the first rule broken: content type, then extension, then size', () => {
    const service = new FileUploadPolicyService({
      contentTypes: ['image/png'],
      extensions: ['png'],
      maxSize: 1,
    });

    expect(ruleRefused(service, file)).toEqual('contentType');
    expect(ruleRefused(service, { ...file, contentType: 'image/png' })).toEqual(
      'extension',
    );
    expect(
      ruleRefused(service, {
        ...file,
        contentType: 'image/png',
        fileName: 'a.png',
      }),
    ).toEqual('size');
  });
});
