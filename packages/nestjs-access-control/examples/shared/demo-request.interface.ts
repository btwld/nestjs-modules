/**
 * The parts of an HTTP request the examples read.
 */
export interface DemoRequestInterface {
  headers: Record<string, string | undefined>;
  params: Record<string, string | undefined>;
  user?: { id: string };
}
