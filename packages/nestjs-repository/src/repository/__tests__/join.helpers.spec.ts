import { Join } from '../join.helpers.js';

describe('Join', () => {
  describe('static left()', () => {
    it('should create a LEFT join clause', () => {
      expect(Join.left('posts')).toEqual({
        relation: 'posts',
        joinType: 'LEFT',
      });
    });
  });

  describe('static inner()', () => {
    it('should create an INNER join clause', () => {
      expect(Join.inner('company')).toEqual({
        relation: 'company',
        joinType: 'INNER',
      });
    });
  });

  describe('static join()', () => {
    it('should wrap clauses in a { join } object', () => {
      expect(Join.join(Join.left('posts'), Join.inner('company'))).toEqual({
        join: [
          { relation: 'posts', joinType: 'LEFT' },
          { relation: 'company', joinType: 'INNER' },
        ],
      });
    });

    it('should return empty join for no clauses', () => {
      expect(Join.join()).toEqual({ join: [] });
    });

    it('should handle a single clause', () => {
      expect(Join.join(Join.left('posts'))).toEqual({
        join: [{ relation: 'posts', joinType: 'LEFT' }],
      });
    });
  });
});
