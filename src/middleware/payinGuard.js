'use strict';

const rateLimit = require('express-rate-limit');
const { getUserStatus } = require('../models/user.model');
const { appLogger, payinErrorLogger } = require('../utils/logger');

const payinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
  skip: (req) => req.method !== 'POST',
  handler: (req, res, next, options) => {
    appLogger.warn('Payin rate limit exceeded', {
      userId: req.body?.userId,
      ip: req.ip,
      timestamp: new Date().toISOString(),
    });
    return res.status(429).json({
      status: 'error',
      message: 'Too many recharge attempts. Please try again later.',
      traceId: req.traceId || 'UNKNOWN',
    });
  },
});

async function userRechargeGuard(req, res, next) {
  const traceId = req.traceId || 'UNKNOWN';
  const userId = req.body?.userId;

  if (!userId) {
    payinErrorLogger.error('userId missing in recharge guard', { traceId, body: req.body });
    return res.status(422).json({
      status: 'error',
      message: 'userId is required',
      traceId,
    });
  }

  try {
    const status = await getUserStatus(userId);

    if (status === null) {
      appLogger.warn('User not found in users table', { traceId, userId });
      return res.status(403).json({
        status: 'error',
        message: 'User not allowed to recharge',
        traceId,
      });
    }

    if (Number(status) !== 1) {
      appLogger.warn('User status not 1, recharge blocked', { traceId, userId, status });
      return res.status(403).json({
        status: 'error',
        message: 'not allowed to recharge',
        traceId,
      });
    }

    next();
  } catch (err) {
    appLogger.error('Error in userRechargeGuard', { traceId, userId, error: err.message });
    return res.status(500).json({
      status: 'error',
      message: 'Unable to verify user status',
      traceId,
    });
  }
}

module.exports = { payinRateLimiter, userRechargeGuard };
