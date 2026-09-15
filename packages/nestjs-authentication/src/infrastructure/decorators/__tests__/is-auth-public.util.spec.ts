import { AuthPublic } from '../auth-public.decorator.js';
import { isAuthPublic } from '../is-auth-public.util.js';

describe('isAuthPublic', () => {
  it('should return false when no target carries the metadata', () => {
    class TestClass {
      testMethod() {
        return 'test';
      }
    }

    expect(isAuthPublic(TestClass.prototype.testMethod)).toBe(false);
  });

  it('should return true when the given target is decorated with @AuthPublic()', () => {
    class TestClass {
      @AuthPublic()
      testMethod() {
        return 'test';
      }
    }

    expect(isAuthPublic(TestClass.prototype.testMethod)).toBe(true);
  });

  it('should return true when a class is decorated with @AuthPublic({ classLevel: true })', () => {
    @AuthPublic({ classLevel: true })
    class TestClass {
      testMethod() {
        return 'test';
      }
    }

    expect(isAuthPublic(TestClass)).toBe(true);
  });

  it('should check every given target, not just the first', () => {
    @AuthPublic({ classLevel: true })
    class TestClass {
      testMethod() {
        return 'test';
      }
    }

    expect(isAuthPublic(TestClass.prototype.testMethod, TestClass)).toBe(true);
  });

  it('should return false when none of the given targets carry the metadata', () => {
    class TestClass {
      testMethod() {
        return 'test';
      }
    }

    expect(isAuthPublic(TestClass.prototype.testMethod, TestClass)).toBe(false);
  });
});
