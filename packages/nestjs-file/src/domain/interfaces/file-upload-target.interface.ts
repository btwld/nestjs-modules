/**
 * Where and how the client uploads a file's bytes, straight to storage.
 * The storage service signs the file's declared `contentType` and `size`
 * into it, so storage refuses an upload that doesn't match.
 */
export interface FileUploadTargetInterface {
  /**
   * Signed, expiring URL the client sends the bytes to.
   */
  url: string;

  /**
   * `PUT` sends the bytes as the request body; `POST` sends a
   * `multipart/form-data` form of `fields` followed by the file.
   */
  method: 'PUT' | 'POST';

  /**
   * Headers the client must send unchanged, such as a signed
   * `Content-Type`.
   */
  headers?: Record<string, string>;

  /**
   * Form fields a `POST` must send, in order, before the file.
   */
  fields?: Record<string, string>;
}
