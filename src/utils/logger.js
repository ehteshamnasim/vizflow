/**
 * ============================================================================
 * LOGGER UTILITY
 * ============================================================================
 * 
 * A simple logger that only outputs in development mode.
 * In production builds, these calls are effectively no-ops.
 * 
 * ============================================================================
 */

const isDev = typeof process !== 'undefined' 
  ? process.env?.NODE_ENV === 'development'
  : (typeof window !== 'undefined' && window.location?.hostname === 'localhost');

export const logger = {
  log: (...args) => {
    if (isDev) console.log('[FlowKit]', ...args);
  },
  
  warn: (...args) => {
    if (isDev) console.warn('[FlowKit]', ...args);
  },
  
  error: (...args) => {
    // Errors always show (important for debugging)
    console.error('[FlowKit]', ...args);
  },
  
  debug: (...args) => {
    if (isDev) console.debug('[FlowKit]', ...args);
  }
};

export default logger;
