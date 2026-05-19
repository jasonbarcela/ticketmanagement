// ============================================================
// utils/AppError.js — Structured Application Error Class
//
// Wraps operational errors with an HTTP status code so
// controllers can throw rather than manually construct every
// error response. The global error handler in server.js
// catches these and serializes them consistently.
// ============================================================

class AppError extends Error {
  /**
   * @param {string} message  - Human-readable error message.
   * @param {number} status   - HTTP status code (default 400).
   */
  constructor(message, status = 400) {
    super(message);
    this.status = status;
    this.name   = 'AppError';
  }
}

module.exports = AppError;
