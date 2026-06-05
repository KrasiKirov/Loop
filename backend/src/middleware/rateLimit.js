const rateLimit = require('express-rate-limit');

// Factory so the limit/window are explicit and testable.
const createLimiter = (max, windowMs = 15 * 60 * 1000) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

module.exports = { createLimiter };
