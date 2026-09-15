import { OrderBy } from '../order-by.helpers.js';
import { SortOrder } from '../repository.types.js';

interface TestEntity {
  id: string;
  name: string;
  createdAt: string;
}

describe('OrderBy', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // Static asc / desc
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static asc()', () => {
    it('should create an ASC sort key', () => {
      const result = OrderBy.asc<TestEntity>('name');
      expect(result).toEqual({ field: 'name', order: SortOrder.ASC });
    });
  });

  describe('static desc()', () => {
    it('should create a DESC sort key', () => {
      const result = OrderBy.desc<TestEntity>('createdAt');
      expect(result).toEqual({ field: 'createdAt', order: SortOrder.DESC });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static order()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static order()', () => {
    it('should wrap keys in an { order } object', () => {
      const result = OrderBy.order(
        OrderBy.desc<TestEntity>('createdAt'),
        OrderBy.asc<TestEntity>('name'),
      );
      expect(result).toEqual({
        order: [
          { field: 'createdAt', order: SortOrder.DESC },
          { field: 'name', order: SortOrder.ASC },
        ],
      });
    });

    it('should return empty order for no keys', () => {
      expect(OrderBy.order()).toEqual({ order: [] });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static for()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static for()', () => {
    it('should return an OrderBy instance', () => {
      const o = OrderBy.for<TestEntity>();
      expect(o).toBeInstanceOf(OrderBy);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Static rel() and relDot()
  // ═══════════════════════════════════════════════════════════════════════════

  describe('static rel()', () => {
    it('should tag a sort key with a relation name', () => {
      const key = OrderBy.asc<TestEntity>('name');
      const result = OrderBy.rel('posts', key);
      expect(result).toEqual({
        field: 'name',
        order: SortOrder.ASC,
        relation: 'posts',
      });
    });

    it('should not mutate the original key', () => {
      const key = OrderBy.asc<TestEntity>('name');
      OrderBy.rel('posts', key);
      expect('relation' in key).toBe(false);
    });
  });

  describe('static relDot()', () => {
    it('should extract relation from dot-notation field', () => {
      const key = OrderBy.asc('title');
      const result = OrderBy.relDot('blog.title', key);
      expect(result).toEqual({
        field: 'title',
        order: SortOrder.ASC,
        relation: 'blog',
      });
    });

    it('should return key unchanged when no dot is present', () => {
      const key = OrderBy.asc('name');
      const result = OrderBy.relDot('name', key);
      expect(result).toEqual({ field: 'name', order: SortOrder.ASC });
    });

    it('should throw when leading dot produces empty relation', () => {
      const key = OrderBy.asc('field');
      expect(() => OrderBy.relDot('.field', key)).toThrow(
        'relDot expects "relation.field" dot notation',
      );
    });

    it('should throw for multi-dot fields', () => {
      const key = OrderBy.asc('c');
      expect(() => OrderBy.relDot('a.b.c', key)).toThrow(
        'relDot expects "relation.field" dot notation',
      );
    });

    it('should not mutate the original key', () => {
      const key = OrderBy.asc('title');
      OrderBy.relDot('blog.title', key);
      expect('relation' in key).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Instance API
  // ═══════════════════════════════════════════════════════════════════════════

  describe('instance API', () => {
    const o = OrderBy.for<TestEntity>();

    it('asc() should delegate to OrderBy.asc', () => {
      expect(o.asc('name')).toEqual({
        field: 'name',
        order: SortOrder.ASC,
      });
    });

    it('desc() should delegate to OrderBy.desc', () => {
      expect(o.desc('createdAt')).toEqual({
        field: 'createdAt',
        order: SortOrder.DESC,
      });
    });

    it('rel() should delegate to OrderBy.rel', () => {
      const key = o.asc('name');
      expect(o.rel('posts', key)).toEqual({
        field: 'name',
        order: SortOrder.ASC,
        relation: 'posts',
      });
    });

    it('relDot() should delegate to OrderBy.relDot', () => {
      const key = o.asc('name');
      expect(o.relDot('blog.name', key)).toEqual({
        field: 'name',
        order: SortOrder.ASC,
        relation: 'blog',
      });
    });

    it('order() should wrap keys in an { order } object', () => {
      expect(o.order(o.desc('createdAt'), o.asc('name'))).toEqual({
        order: [
          { field: 'createdAt', order: SortOrder.DESC },
          { field: 'name', order: SortOrder.ASC },
        ],
      });
    });
  });
});
