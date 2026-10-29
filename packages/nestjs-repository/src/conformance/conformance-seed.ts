import { type ConformanceContext } from './conformance-context.js';
import { type ConformanceAuthorInterface } from './interfaces/conformance-author.interface.js';
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
 * Three authors (cat has no books), four books (delta has no author), and
 * two tags: tech on alpha and beta, news on alpha only.
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

  await ctx.linkBookTag('book-alpha', 'tag-tech');
  await ctx.linkBookTag('book-beta', 'tag-tech');
  await ctx.linkBookTag('book-alpha', 'tag-news');

  return {
    authors: { ann, bob, cat },
    books: { alpha, beta, gamma, delta },
    tags: { news, tech },
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

/** A tag's own columns, without relations. */
export function ownTag({
  id,
  label,
}: ConformanceTagInterface): ConformanceTagInterface {
  return { id, label };
}
