/**
 * Every status a file row can hold, in lifecycle order.
 */
export const FILE_STATUSES = [
  'pending',
  'scanning',
  'rescanning',
  'active',
  'rejecting',
  'rejected',
  'removing',
  'remove-failed',
] as const;

/**
 * Where a file is in its lifecycle.
 *
 * - `pending`: the row exists and the client has an upload target, but the
 *   upload is not confirmed.
 * - `scanning`: the upload is confirmed and the scanner has been asked to
 *   check it. Only with a scanner registered.
 * - `rescanning`: the first scan was uncertain and the scanner has been
 *   asked once more.
 * - `active`: the upload is confirmed and, with a scanner, passed its scan.
 *   The only status that gets a download URL.
 * - `rejecting`: the scan found the file infected, or was uncertain twice;
 *   its stored object is being deleted.
 * - `rejected`: the stored object is deleted. The row stays as the record of
 *   what was refused.
 * - `removing`: a removal has started. The stored object may or may not be
 *   deleted yet.
 * - `remove-failed`: a removal didn't finish. The storage service failed to
 *   delete the object, or the file was restored while its object was being
 *   deleted. Run the removal again to retry.
 */
export type FileStatus = (typeof FILE_STATUSES)[number];
