export type ParameterObject = {
  name: string;
  in: string;
  [k: string]: unknown;
};
export type OperationObject = {
  parameters?: (ParameterObject | { $ref: string })[];
  requestBody?: unknown;
  responses?: Record<string, unknown>;
  operationId?: string;
  tags?: string[];
};
export type SchemaObject = {
  required?: string[];
  properties?: Record<string, unknown>;
  enum?: unknown[];
  type?: string;
  items?: unknown;
  format?: string;
};
