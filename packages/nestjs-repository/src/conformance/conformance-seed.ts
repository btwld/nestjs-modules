import { type ConformanceContext } from './conformance-context.js';
import { type ConformanceAuthorInterface } from './interfaces/conformance-author.interface.js';
import { type ConformanceAwardInterface } from './interfaces/conformance-award.interface.js';
import { type ConformanceBookInterface } from './interfaces/conformance-book.interface.js';
import { type ConformanceItemInterface } from './interfaces/conformance-item.interface.js';
import { type ConformanceLibraryInterface } from './interfaces/conformance-library.interface.js';
import { type ConformanceTagInterface } from './interfaces/conformance-tag.interface.js';

/**
 * Five items for the operator, order and paging cases. Notes hold the
 * characters a text match must take literally.
 */
export function seedItems(
  ctx: ConformanceContext,
): Promise<ConformanceItemInterface[]> {
  return ctx.repo('item').createMany([
    { name: 'alpha', rank: 1, note: '100% sure' },
    { name: 'bravo', rank: 2, note: 'snake_case' },
    { name: 'charlie', rank: 3, note: null },
    { name: 'delta', rank: null, note: 'back\\slash' },
    { name: 'echo', rank: 5, note: 'plain' },
  ]);
}

/**
 * Three authors (cat has no books), four books (delta has no author), two
 * tags (tech on alpha and beta, news on alpha only, linked only when the
 * driver supports relations), and four awards (copper and silver to ann,
 * bronze and gold to bob).
 */
export async function seedLibrary(
  ctx: ConformanceContext,
): Promise<ConformanceLibraryInterface> {
  const [ann, bob, cat] = await ctx.repo('author').createMany([
    { id: 'author-ann', name: 'ann' },
    { id: 'author-bob', name: 'bob' },
    { id: 'author-cat', name: 'cat' },
  ]);

  const [alpha, beta, gamma, delta] = await ctx.repo('book').createMany([
    { id: 'book-alpha', title: 'alpha', authorId: 'author-ann' },
    { id: 'book-beta', title: 'beta', authorId: 'author-ann' },
    { id: 'book-gamma', title: 'gamma', authorId: 'author-bob' },
    { id: 'book-delta', title: 'delta', authorId: null },
  ]);

  const [news, tech] = await ctx.repo('tag').createMany([
    { id: 'tag-news', label: 'news' },
    { id: 'tag-tech', label: 'tech' },
  ]);

  if (ctx.capabilities.relations === 'supported') {
    await ctx.linkBookTag('book-alpha', 'tag-tech');
    await ctx.linkBookTag('book-beta', 'tag-tech');
    await ctx.linkBookTag('book-alpha', 'tag-news');
  }

  const [copper, silver, bronze, gold] = await ctx.repo('award').createMany([
    { id: 'award-copper', name: 'copper', authorId: 'author-ann' },
    { id: 'award-silver', name: 'silver', authorId: 'author-ann' },
    { id: 'award-bronze', name: 'bronze', authorId: 'author-bob' },
    { id: 'award-gold', name: 'gold', authorId: 'author-bob' },
  ]);

  return {
    authors: { ann, bob, cat },
    books: { alpha, beta, gamma, delta },
    tags: { news, tech },
    awards: { copper, silver, bronze, gold },
  };
}

/** A book's own columns, without relations. */
export function ownBook({
  id,
  title,
  authorId,
  removedAt,
}: ConformanceBookInterface): ConformanceBookInterface {
  return { id, title, authorId, removedAt };
}

/** An author's own columns, without relations. */
export function ownAuthor({
  id,
  name,
  removedAt,
}: ConformanceAuthorInterface): ConformanceAuthorInterface {
  return { id, name, removedAt };
}

/** An award's own columns, without relations. */
export function ownAward({
  id,
  name,
  authorId,
}: ConformanceAwardInterface): ConformanceAwardInterface {
  return { id, name, authorId };
}

/** A tag's own columns, without relations. */
export function ownTag({
  id,
  label,
}: ConformanceTagInterface): ConformanceTagInterface {
  return { id, label };
}
