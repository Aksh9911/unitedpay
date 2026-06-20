'use strict';

const { systemErrorLogger, payinErrorLogger, payoutErrorLogger } = require('../utils/logger');
const { errorResponse } = require('../utils/response.util');

const ERROR_MAP = {
  VALIDATION_ERROR: { status: 422, message: 'Validation failed' },
  INVALID_SIGNATURE: { status: 400, message: 'Invalid signature' },
  AES_ENCRYPT_ERROR: { status: 500, message: 'Encryption failure' },
  AES_DECRYPT_ERROR: { status: 500, message: 'Decryption failure' },
  REMOTE_API_ERROR: { status: 502, message: 'Remote API error' },
  REMOTE_TIMEOUT: { status: 504, message: 'Remote API timeout' },
  INVALID_PAYLOAD: { status: 400, message: 'Invalid payload' },
  WEBHOOK_ERROR: { status: 400, message: 'Webhook processing error' },
  BLOCKED_USER: { status: 403, message: 'Deposit is blocked for this account.' },
};

function errorHandler(err, req, res, next) {
  const traceId = req.traceId || 'UNKNOWN';
  const url = req.originalUrl || '';
  const isPayin = url.includes('payin');
  const isPayout = url.includes('payout');

  const code = err.code || 'INTERNAL_ERROR';
  const mapped = ERROR_MAP[code] || { status: 500, message: 'Internal server error' };

  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    module: isPayin ? 'PAYIN' : isPayout ? 'PAYOUT' : 'SYSTEM',
    endpoint: url,
    tradeNo: req.body?.tradeNo || req.resolvedTradeNo || 'N/A',
    errorType: code,
    errorMessage: err.message,
    stackTrace: err.stack,
    requestPayload: req.body || null,
    responsePayload: null,
  };

  systemErrorLogger.error('Unhandled error', logEntry);

  if (isPayin) {
    payinErrorLogger.error('Payin error', logEntry);
  } else if (isPayout) {
    payoutErrorLogger.error('Payout error', logEntry);
  }

  return errorResponse(res, mapped.status, mapped.message, traceId, err.message);
}

module.exports = errorHandler;
