/**
 * ============================================================================
 * SANITIZER UTILITY
 * ============================================================================
 * 
 * Simple HTML sanitization to prevent XSS attacks.
 * For production use with user-generated content, consider using DOMPurify.
 * 
 * ============================================================================
 */

/**
 * Escape HTML special characters to prevent XSS
 * @param {string} str - String to escape
 * @returns {string} Escaped string safe for innerHTML
 */
export function escapeHtml(str) {
  if (typeof str !== 'string') {
    return String(str ?? '');
  }
  
  const htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  
  return str.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

/**
 * Sanitize a string for use in HTML attributes
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeAttribute(str) {
  if (typeof str !== 'string') {
    return String(str ?? '');
  }
  return str.replace(/[<>"'&]/g, '');
}

/**
 * Create a text node safely (alternative to innerHTML for plain text)
 * @param {string} text - Text content
 * @returns {Text} Text node
 */
export function createTextNode(text) {
  return document.createTextNode(text ?? '');
}

/**
 * Safely set element text content
 * @param {HTMLElement} element - Target element
 * @param {string} text - Text to set
 */
export function setTextContent(element, text) {
  if (element) {
    element.textContent = text ?? '';
  }
}

/**
 * Validate and sanitize JSON string
 * @param {string} jsonString - JSON string to validate
 * @returns {object|null} Parsed object or null if invalid
 */
export function safeJsonParse(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    return null;
  }
}

/**
 * Check if a string contains potentially dangerous patterns
 * @param {string} str - String to check
 * @returns {boolean} True if potentially dangerous
 */
export function containsDangerousPatterns(str) {
  if (typeof str !== 'string') return false;
  
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,  // onclick=, onerror=, etc.
    /data:/i,
    /vbscript:/i
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(str));
}

export default {
  escapeHtml,
  sanitizeAttribute,
  createTextNode,
  setTextContent,
  safeJsonParse,
  containsDangerousPatterns
};
