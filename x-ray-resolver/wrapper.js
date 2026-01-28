/**
 * Lambda wrapper for ADOT auto-instrumentation compatibility
 *
 * This wrapper loads the bundled code and re-exports the handler
 * as a configurable property that shimmer can wrap.
 */

const bundled = require('./index.js');

// Export handler as a configurable property for ADOT instrumentation
Object.defineProperty(exports, 'handler', {
  value: bundled.handler,
  writable: true,
  configurable: true,
  enumerable: true
});
