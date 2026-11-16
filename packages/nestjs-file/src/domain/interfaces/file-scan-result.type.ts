/**
 * Every result a scan can report.
 */
export const FILE_SCAN_RESULTS = ['clean', 'infected', 'uncertain'] as const;

/**
 * What a scan found. Record a scan that timed out or failed to run as
 * `uncertain`.
 */
export type FileScanResult = (typeof FILE_SCAN_RESULTS)[number];
