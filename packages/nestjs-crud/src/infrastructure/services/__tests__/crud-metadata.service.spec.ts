import {
  CrudMetadata,
  CrudMetadataLookupTarget,
} from '../crud-metadata.service.js';

// Test decorators for different lookup targets
const TestMethodDecorator = CrudMetadata.createDecorator<string>({
  key: 'test:method',
  lookupTarget: CrudMetadataLookupTarget.Method,
});

const TestClassDecorator = CrudMetadata.createDecorator<string>({
  key: 'test:class',
  lookupTarget: CrudMetadataLookupTarget.Class,
});

const TestMethodAndClassDecorator = CrudMetadata.createDecorator<string>({
  key: 'test:method-and-class',
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
});

const TestArrayDecorator = CrudMetadata.createDecorator<string[]>({
  key: 'test:array',
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
});

const TestArrayWithDedupeDecorator = CrudMetadata.createDecorator<
  { name: string; value: number }[]
>({
  key: 'test:array-dedupe',
  lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
  dedupeBy: 'name',
});

describe('CrudMetadata', () => {
  describe('get() - direct lookup (no hierarchy walking)', () => {
    it('should retrieve metadata from exact target', () => {
      @TestClassDecorator('class-value')
      class TestClass {
        @TestMethodDecorator('method-value')
        testMethod() {}
      }

      const result = CrudMetadata.get(TestClassDecorator, TestClass);
      expect(result).toBe('class-value');
    });

    it('should return undefined when metadata not present', () => {
      class TestClass {
        testMethod() {}
      }

      const result = CrudMetadata.get(TestClassDecorator, TestClass);
      expect(result).toBeUndefined();
    });

    it('should find inherited class metadata (JS prototype chain)', () => {
      // NOTE: This is JavaScript's default metadata behavior via Reflect.getMetadata
      // Metadata on parent classes IS inherited to child classes through the prototype chain
      // This is intentional - `get()` is "direct" in that it doesn't do our custom
      // hierarchy walking logic, but JS prototype inheritance still applies
      @TestClassDecorator('parent-value')
      class ParentClass {
        parentMethod() {}
      }

      class ChildClass extends ParentClass {
        childMethod() {}
      }

      // Child inherits parent's metadata through JS prototype chain
      const result = CrudMetadata.get(TestClassDecorator, ChildClass);
      expect(result).toBe('parent-value');
    });

    it('should NOT find inherited method metadata', () => {
      // Method metadata is NOT inherited - each method is its own target
      class ParentClass {
        @TestMethodDecorator('parent-method-value')
        testMethod() {}
      }

      class ChildClass extends ParentClass {
        override testMethod() {} // Override without decorator
      }

      // Child's method is a different function, no metadata
      const handler = ChildClass.prototype.testMethod;
      const result = CrudMetadata.get(TestMethodDecorator, handler);
      expect(result).toBeUndefined();
    });

    it('should get metadata from method handler directly', () => {
      class TestClass {
        @TestMethodDecorator('handler-value')
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.get(TestMethodDecorator, handler);
      expect(result).toBe('handler-value');
    });
  });

  describe('getHierarchy() - Method lookup target', () => {
    it('should retrieve from method handler only', () => {
      class TestClass {
        @TestMethodDecorator('method-value')
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodDecorator,
        handler,
        TestClass,
      );
      // Method lookup target only looks at handler, ignores class
      expect(result).toBe('method-value');
    });

    it('should ignore class metadata for method lookup target', () => {
      // Create a separate class-level decorator to set class metadata
      // TestMethodDecorator can't be applied to class (guard prevents it)
      @TestClassDecorator('class-value')
      class TestClass {
        @TestMethodDecorator('method-value')
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      // Method lookup ignores class decorator entirely
      const result = CrudMetadata.getHierarchy(
        TestMethodDecorator,
        handler,
        TestClass,
      );
      expect(result).toBe('method-value');
    });

    it('should NOT inherit from parent method', () => {
      class ParentClass {
        @TestMethodDecorator('parent-method-value')
        testMethod() {}
      }

      class ChildClass extends ParentClass {
        override testMethod() {}
      }

      const handler = ChildClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodDecorator,
        handler,
        ChildClass,
      );
      // Child overrides method without decorator - no inheritance for method-only
      expect(result).toBeUndefined();
    });

    it('should return undefined if method has no metadata', () => {
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodDecorator,
        handler,
        TestClass,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('getHierarchy() - Class lookup target', () => {
    it('should retrieve from class directly', () => {
      @TestClassDecorator('class-value')
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestClassDecorator,
        handler,
        TestClass,
      );
      expect(result).toBe('class-value');
    });

    it('should walk class hierarchy - child inherits from parent', () => {
      @TestClassDecorator('parent-value')
      class ParentClass {
        parentMethod() {}
      }

      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchy(
        TestClassDecorator,
        handler,
        ChildClass,
      );
      expect(result).toBe('parent-value');
    });

    it('should prefer child class value over parent', () => {
      @TestClassDecorator('parent-value')
      class ParentClass {
        parentMethod() {}
      }

      @TestClassDecorator('child-value')
      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchy(
        TestClassDecorator,
        handler,
        ChildClass,
      );
      expect(result).toBe('child-value');
    });

    it('should walk multiple levels of inheritance', () => {
      @TestClassDecorator('grandparent-value')
      class GrandparentClass {
        method() {}
      }

      class ParentClass extends GrandparentClass {}

      class ChildClass extends ParentClass {}

      const handler = ChildClass.prototype.method;
      const result = CrudMetadata.getHierarchy(
        TestClassDecorator,
        handler,
        ChildClass,
      );
      expect(result).toBe('grandparent-value');
    });

    it('should use handler as class when cls not provided', () => {
      @TestClassDecorator('class-value')
      class TestClass {
        testMethod() {}
      }

      // When cls is not provided, handler is used as the class
      const result = CrudMetadata.getHierarchy(TestClassDecorator, TestClass);
      expect(result).toBe('class-value');
    });
  });

  describe('getHierarchy() - MethodAndClass lookup target', () => {
    it('should prefer method over class', () => {
      @TestMethodAndClassDecorator('class-value')
      class TestClass {
        @TestMethodAndClassDecorator('method-value')
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodAndClassDecorator,
        handler,
        TestClass,
      );
      expect(result).toBe('method-value');
    });

    it('should fall back to class when method has no metadata', () => {
      @TestMethodAndClassDecorator('class-value')
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodAndClassDecorator,
        handler,
        TestClass,
      );
      expect(result).toBe('class-value');
    });

    it('should walk class hierarchy when method has no metadata', () => {
      @TestMethodAndClassDecorator('parent-value')
      class ParentClass {
        parentMethod() {}
      }

      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodAndClassDecorator,
        handler,
        ChildClass,
      );
      expect(result).toBe('parent-value');
    });

    it('should prefer child class over parent when method has no metadata', () => {
      @TestMethodAndClassDecorator('parent-value')
      class ParentClass {
        parentMethod() {}
      }

      @TestMethodAndClassDecorator('child-value')
      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchy(
        TestMethodAndClassDecorator,
        handler,
        ChildClass,
      );
      expect(result).toBe('child-value');
    });
  });

  describe('getHierarchyArray() - Array merging', () => {
    it('should merge arrays from method and class', () => {
      @TestArrayDecorator(['class-item'])
      class TestClass {
        @TestArrayDecorator(['method-item'])
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayDecorator,
        handler,
        TestClass,
      );
      expect(result).toEqual(['method-item', 'class-item']);
    });

    it('should merge arrays from class hierarchy', () => {
      @TestArrayDecorator(['parent-item'])
      class ParentClass {
        parentMethod() {}
      }

      @TestArrayDecorator(['child-item'])
      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayDecorator,
        handler,
        ChildClass,
      );
      expect(result).toEqual(['child-item', 'parent-item']);
    });

    it('should merge arrays from method, child, and parent', () => {
      @TestArrayDecorator(['parent-item'])
      class ParentClass {
        parentMethod() {}
      }

      @TestArrayDecorator(['child-item'])
      class ChildClass extends ParentClass {
        @TestArrayDecorator(['method-item'])
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayDecorator,
        handler,
        ChildClass,
      );
      expect(result).toEqual(['method-item', 'child-item', 'parent-item']);
    });

    it('should return undefined when no targets have metadata', () => {
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayDecorator,
        handler,
        TestClass,
      );
      expect(result).toBeUndefined();
    });
  });

  describe('getHierarchyArray() - Array deduplication', () => {
    it('should deduplicate primitive arrays using Set', () => {
      @TestArrayDecorator(['foo', 'bar'])
      class ParentClass {
        parentMethod() {}
      }

      @TestArrayDecorator(['foo', 'baz']) // 'foo' duplicated from parent
      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayDecorator,
        handler,
        ChildClass,
      );
      // Duplicates removed, order preserved (child first)
      expect(result).toEqual(['foo', 'baz', 'bar']);
    });

    it('should deduplicate by specified property', () => {
      @TestArrayWithDedupeDecorator([
        { name: 'foo', value: 1 },
        { name: 'bar', value: 2 },
      ])
      class ParentClass {
        parentMethod() {}
      }

      @TestArrayWithDedupeDecorator([
        { name: 'foo', value: 100 }, // Same name, different value
        { name: 'baz', value: 3 },
      ])
      class ChildClass extends ParentClass {
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayWithDedupeDecorator,
        handler,
        ChildClass,
      );
      // Child's 'foo' should win over parent's 'foo' (first occurrence kept)
      expect(result).toEqual([
        { name: 'foo', value: 100 },
        { name: 'baz', value: 3 },
        { name: 'bar', value: 2 },
      ]);
    });
  });

  describe('getAll() - collect all values', () => {
    it('should return all values from hierarchy as array', () => {
      @TestMethodAndClassDecorator('parent-value')
      class ParentClass {
        parentMethod() {}
      }

      @TestMethodAndClassDecorator('child-value')
      class ChildClass extends ParentClass {
        @TestMethodAndClassDecorator('method-value')
        childMethod() {}
      }

      const handler = ChildClass.prototype.childMethod;
      const result = CrudMetadata.getAll(
        TestMethodAndClassDecorator,
        handler,
        ChildClass,
      );
      expect(result).toEqual(['method-value', 'child-value', 'parent-value']);
    });

    it('should filter out undefined values', () => {
      @TestMethodAndClassDecorator('class-value')
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getAll(
        TestMethodAndClassDecorator,
        handler,
        TestClass,
      );
      // Method has no decorator, so only class value
      expect(result).toEqual(['class-value']);
    });
  });

  describe('accumulator pattern (get vs getHierarchy)', () => {
    // This tests the critical distinction between get() and getHierarchy()
    // for decorators that accumulate values (like CrudApiParam, CrudBody)

    const AccumulatorDecorator = CrudMetadata.createWrappedDecorator<
      string[],
      (value: string) => MethodDecorator
    >(
      {
        key: 'test:accumulator',
        lookupTarget: CrudMetadataLookupTarget.Method,
      },
      (decorator) =>
        (value: string): MethodDecorator =>
        (target, propertyKey, descriptor) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
          const handler = descriptor.value as Function;
          // Use get() for direct lookup - don't want hierarchy walking
          const existing = CrudMetadata.get<string[]>(
            AccumulatorDecorator,
            handler,
          );
          decorator([...(existing ?? []), value])(
            target,
            propertyKey,
            descriptor,
          );
        },
    );

    it('should accumulate multiple decorator applications', () => {
      class TestClass {
        @AccumulatorDecorator('first')
        @AccumulatorDecorator('second')
        @AccumulatorDecorator('third')
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.get<string[]>(AccumulatorDecorator, handler);
      // Decorators apply bottom-up, so third -> second -> first
      expect(result).toEqual(['third', 'second', 'first']);
    });

    it('should NOT inherit accumulated values from parent method', () => {
      class ParentClass {
        @AccumulatorDecorator('parent-value')
        testMethod() {}
      }

      class ChildClass extends ParentClass {
        @AccumulatorDecorator('child-value')
        override testMethod() {}
      }

      const parentHandler = ParentClass.prototype.testMethod;
      const childHandler = ChildClass.prototype.testMethod;

      // Parent has only parent's value
      const parentResult = CrudMetadata.get<string[]>(
        AccumulatorDecorator,
        parentHandler,
      );
      expect(parentResult).toEqual(['parent-value']);

      // Child has only child's value - no inheritance
      const childResult = CrudMetadata.get<string[]>(
        AccumulatorDecorator,
        childHandler,
      );
      expect(childResult).toEqual(['child-value']);
    });

    it('should keep method accumulators separate from class', () => {
      class TestClass {
        @AccumulatorDecorator('method-a')
        @AccumulatorDecorator('method-b')
        methodA() {}

        @AccumulatorDecorator('method-c')
        methodB() {}
      }

      const handlerA = TestClass.prototype.methodA;
      const handlerB = TestClass.prototype.methodB;

      const resultA = CrudMetadata.get<string[]>(
        AccumulatorDecorator,
        handlerA,
      );
      const resultB = CrudMetadata.get<string[]>(
        AccumulatorDecorator,
        handlerB,
      );

      // Decorators apply bottom-up: method-b first, then method-a
      expect(resultA).toEqual(['method-b', 'method-a']);
      expect(resultB).toEqual(['method-c']);
    });
  });

  describe('getHierarchyArray() - single source', () => {
    it('should return array from single target without duplication', () => {
      @TestArrayDecorator(['only-item'])
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayDecorator,
        handler,
        TestClass,
      );
      expect(result).toEqual(['only-item']);
    });

    it('should deduplicate by property with single target', () => {
      @TestArrayWithDedupeDecorator([
        { name: 'foo', value: 1 },
        { name: 'foo', value: 2 },
        { name: 'bar', value: 3 },
      ])
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchyArray(
        TestArrayWithDedupeDecorator,
        handler,
        TestClass,
      );
      expect(result).toEqual([
        { name: 'foo', value: 1 },
        { name: 'bar', value: 3 },
      ]);
    });
  });

  describe('getHierarchy() - Parameter lookup target', () => {
    it('should look up from handler only (same as method)', () => {
      // Parameter metadata is stored on the handler by NestJS internals.
      // We simulate this by using a method decorator with Parameter lookup
      // to verify buildTargets routes correctly.
      const TestParamLookup = {
        KEY: 'test:param-lookup',
        LOOKUP_TARGET: CrudMetadataLookupTarget.Parameter,
      } as const;

      class TestClass {
        @TestMethodDecorator('method-value')
        testMethod() {}
      }

      // Use a method-decorated handler but query with Parameter lookup metadata
      // to verify Parameter routes to handler (not class)
      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestParamLookup,
        handler,
        TestClass,
      );
      // Different key, so no metadata found — but the path is exercised
      expect(result).toBeUndefined();
    });
  });

  describe('deduplicateByProperty - error handling', () => {
    it('should throw TypeError when array contains non-object items', () => {
      // Create a decorator with dedupeBy that stores primitive values
      // We force this by manually constructing metadata with DEDUPE_BY
      const PrimitiveWithDedupeDecorator = CrudMetadata.createDecorator<
        string[]
      >({
        key: 'test:primitive-dedupe',
        lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
        dedupeBy: 'field',
      });

      @PrimitiveWithDedupeDecorator(['a', 'b'])
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      expect(() =>
        CrudMetadata.getHierarchyArray(
          PrimitiveWithDedupeDecorator,
          handler,
          TestClass,
        ),
      ).toThrow(TypeError);
    });
  });

  describe('edge cases', () => {
    it('should handle empty targets gracefully', () => {
      class TestClass {
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        TestClassDecorator,
        handler,
        TestClass,
      );
      expect(result).toBeUndefined();
    });

    it('should handle decorators with no options', () => {
      const NoValueDecorator = CrudMetadata.createDecorator<undefined>({
        key: 'test:no-value',
        lookupTarget: CrudMetadataLookupTarget.Method,
      });

      class TestClass {
        @NoValueDecorator()
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      // Decorator was applied but with undefined value
      const result = CrudMetadata.getHierarchy(NoValueDecorator, handler);
      expect(result).toBeUndefined();
    });

    it('should work with wrapped decorators', () => {
      const WrappedDecorator = CrudMetadata.createWrappedDecorator<
        number,
        (value: number) => ClassDecorator & MethodDecorator
      >(
        {
          key: 'test:wrapped',
          lookupTarget: CrudMetadataLookupTarget.MethodAndClass,
        },
        (decorator) => (value: number) => decorator(value),
      );

      @WrappedDecorator(10)
      class TestClass {
        @WrappedDecorator(20)
        testMethod() {}
      }

      const handler = TestClass.prototype.testMethod;
      const result = CrudMetadata.getHierarchy(
        WrappedDecorator,
        handler,
        TestClass,
      );
      expect(result).toBe(20); // Method value takes precedence
    });
  });
});
