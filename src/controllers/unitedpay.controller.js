'use strict';

const service = require('../services/unitedpay.service');
const {
  validatePayinCreate,
  validatePayinQuery,
  validatePayoutCreate,
  validatePayoutQuery,
  validateBalanceQuery,
} = require('../validators/unitedpay.validator');
const { successResponse, errorResponse } = require('../utils/response.util');
const { appLogger, payinErrorLogger, payoutErrorLogger, systemErrorLogger } = require('../utils/logger');

async function payinCreate(req, res, next) {
  const traceId = req.traceId;
  try {
    const validated = validatePayinCreate(req.body);
    const result = await service.createPayin(validated, traceId);
    return successResponse(res, result, traceId);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      payinErrorLogger.error('Payin create validation error', {
        traceId,
        errorType: err.code,
        errorMessage: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      });
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        traceId,
        errors: err.details,
      });
    }
    appLogger.error('payinCreate error', { traceId, error: err.message });
    return next(err);
  }
}

async function payinQuery(req, res, next) {
  const traceId = req.traceId;
  try {
    const validated = validatePayinQuery(req.body);
    const result = await service.queryPayin(validated, traceId);
    return successResponse(res, result, traceId);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      payinErrorLogger.error('Payin query validation error', {
        traceId,
        errorType: err.code,
        errorMessage: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      });
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        traceId,
        errors: err.details,
      });
    }
    appLogger.error('payinQuery error', { traceId, error: err.message });
    return next(err);
  }
}

async function payoutCreate(req, res, next) {
  const traceId = req.traceId;
  try {
    const validated = validatePayoutCreate(req.body);
    const result = await service.createPayout(validated, traceId);
    return successResponse(res, result, traceId);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      payoutErrorLogger.error('Payout create validation error', {
        traceId,
        errorType: err.code,
        errorMessage: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      });
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        traceId,
        errors: err.details,
      });
    }
    appLogger.error('payoutCreate error', { traceId, error: err.message });
    return next(err);
  }
}

async function payoutQuery(req, res, next) {
  const traceId = req.traceId;
  try {
    const validated = validatePayoutQuery(req.body);
    const result = await service.queryPayout(validated, traceId);
    return successResponse(res, result, traceId);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') {
      payoutErrorLogger.error('Payout query validation error', {
        traceId,
        errorType: err.code,
        errorMessage: err.message,
        details: err.details,
        timestamp: new Date().toISOString(),
      });
      return res.status(422).json({
        status: 'error',
        message: 'Validation failed',
        traceId,
        errors: err.details,
      });
    }
    appLogger.error('payoutQuery error', { traceId, error: err.message });
    return next(err);
  }
}

async function balanceQuery(req, res, next) {
  const traceId = req.traceId;
  try {
    validateBalanceQuery(req.body);
    const result = await service.queryBalance(traceId);
    return successResponse(res, result, traceId);
  } catch (err) {
    appLogger.error('balanceQuery error', { traceId, error: err.message });
    return next(err);
  }
}

module.exports = { payinCreate, payinQuery, payoutCreate, payoutQuery, balanceQuery };
