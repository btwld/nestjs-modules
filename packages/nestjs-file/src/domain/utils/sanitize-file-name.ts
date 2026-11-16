/**
 * The longest name kept, in code points.
 */
export const FILE_NAME_MAX_LENGTH = 255;

/**
 * The longest extension, dot included, that truncation keeps.
 */
const EXTENSION_MAX_LENGTH = 32;

/**
 * Control, format, lone surrogate and line or paragraph separator
 * characters. Format characters include the bidirectional overrides (U+202E
 * and kin) that make an `.exe` name display as a `.pdf`. The zero-width
 * non-joiner and joiner (U+200C, U+200D) are kept: Persian and Indic words
 * and emoji sequences need them.
 */
const INVISIBLE_CHARACTERS =
  /(?!\p{Join_Control})[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/gu;

const PATH_SEPARATORS = /[/\\]/;

const DOT_OR_SPACE = /^[.\s]$/u;

/**
 * A caller's file name reduced to a display name: without invisible
 * characters, without any path (the last segment after `/` or `\` is
 * kept), NFC-normalised, trimmed of surrounding whitespace and trailing
 * dots, and at most {@link FILE_NAME_MAX_LENGTH} code points, keeping the
 * extension. Returns `''` when nothing is left, as for `..` or `uploads/`.
 */
export function sanitizeFileName(fileName: string): string {
  const segments = fileName
    .replace(INVISIBLE_CHARACTERS, '')
    .split(PATH_SEPARATORS);

  const name = trimTrailingDotsAndSpaces(
    (segments[segments.length - 1] ?? '').normalize('NFC').trim(),
  );

  return truncate(name);
}

/**
 * Drops trailing whitespace and dots, which some file systems drop
 * silently.
 */
function trimTrailingDotsAndSpaces(name: string): string {
  // A `/[.\s]+$/` pattern backtracks quadratically on a long run of dots
  // followed by anything else; this loop is linear.
  let end = name.length;

  while (end > 0 && DOT_OR_SPACE.test(name.charAt(end - 1))) {
    end--;
  }

  return name.slice(0, end);
}

function truncate(name: string): string {
  const codePoints = Array.from(name);

  if (codePoints.length <= FILE_NAME_MAX_LENGTH) {
    return name;
  }

  const dot = codePoints.lastIndexOf('.');
  const extension = dot > 0 ? codePoints.slice(dot) : [];

  if (extension.length === 0 || extension.length > EXTENSION_MAX_LENGTH) {
    // A head of only dots and spaces trims to nothing; keep the tail instead.
    return (
      trimTrailingDotsAndSpaces(
        codePoints.slice(0, FILE_NAME_MAX_LENGTH).join(''),
      ) || codePoints.slice(-FILE_NAME_MAX_LENGTH).join('')
    );
  }

  const stem = trimTrailingDotsAndSpaces(
    codePoints.slice(0, FILE_NAME_MAX_LENGTH - extension.length).join(''),
  );

  return `${stem}${extension.join('')}`;
}
