/**
 * Every status a file row can hold, in lifecycle order.
 */
export const FILE_STATUSES = [
  'pending',
  'active',
  'removing',
  'remove-failed',
] as const;

/**
 * Where a file is in its lifecycle.
 *
 * - `pending`: the row exists and the client has an upload URL, but the upload
 *   is not confirmed.
 * - `active`: the upload is confirmed.
 * - `removing`: a removal has started. The stored object may or may not be
 *   deleted yet.
 * - `remove-failed`: a removal didn't finish. The storage service failed to
 *   delete the object, or the file was restored while its object was being
 *   deleted. Run the removal again to retry.
 */
export type FileStatus = (typeof FILE_STATUSES)[number];
