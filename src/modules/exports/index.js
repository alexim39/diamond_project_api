/**
 * Public entry for the exports slice (point-in-time CSV snapshots).
 * Session-scoped, never cached — Excel opens the BOM-prefixed output.
 */
export { default, buildExportsRouter } from './interface/Exports.routes.js';
export { toCsv, csvFilename } from './domain/Export.csv.js';
