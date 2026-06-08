'use strict';

const express = require('express');
const router = express.Router();
const { getConfig } = require('../config/unitedpay.config');
const { decryptPayload } = require('../utils/aes.util');
const { verifySignature } = require('../utils/signature.util');
const { validatePayinWebhook, validatePayoutWebhook } = require('../validators/unitedpay.validator');
const {
  isDuplicatePayin,
  markPayinProcessed,
  isDuplicatePayout,
  markPayoutProcessed,
} = require('../storage/webhookCache');
const {
  payinWebhookLogger,
  payoutWebhookLogger,
  payinErrorLogger,
  payoutErrorLogger,
  systemErrorLogger,
  printPayinWebhook,
  printPayoutWebhook,
} = require('../utils/logger');

async function handlePayinWebhook(req, res) {
  const traceId = req.traceId;
  const timestamp = new Date().toISOString();
  const sourceIP = req.ip || req.connection.remoteAddress;
  const headers = req.headers;
  const rawBody = req.body;

  const encryptedPayload = rawBody.payload || null;
  const receivedSign = rawBody.sign || null;

  if (!encryptedPayload || !receivedSign) {
    payinErrorLogger.error('Payin webhook missing payload or sign', {
      traceId,
      timestamp,
      sourceIP,
      rawBody,
    });
    return res.status(400).send('00000');
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    systemErrorLogger.error('Config error in payin webhook', { traceId, error: err.message });
    return res.status(500).send('00000');
  }

  const signValid = verifySignature(encryptedPayload, receivedSign, config.signKey);
  const verificationResult = signValid ? 'VALID' : 'INVALID';

  if (!signValid) {
    payinErrorLogger.error('Payin webhook invalid signature', {
      timestamp,
      traceId,
      sourceIP,
      encryptedPayload,
      receivedSign,
      verificationResult,
    });
    printPayinWebhook({
      traceId,
      timestamp,
      sourceIP,
      receivedSign,
      verificationResult,
      duplicateCheckResult: 'N/A',
      decryptedPayload: 'N/A',
    });
    return res.status(400).send('00000');
  }

  let decrypted;
  let parsed;

  try {
    decrypted = decryptPayload(encryptedPayload);
    parsed = JSON.parse(decrypted);
  } catch (err) {
    payinErrorLogger.error('Payin webhook decryption failed', {
      timestamp,
      traceId,
      sourceIP,
      encryptedPayload,
      errorMessage: err.message,
      stackTrace: err.stack,
    });
    return res.status(400).send('00000');
  }

  try {
    validatePayinWebhook(parsed);
  } catch (err) {
    payinErrorLogger.error('Payin webhook validation failed', {
      timestamp,
      traceId,
      sourceIP,
      decryptedPayload: decrypted,
      errorMessage: err.message,
      details: err.details,
    });
    return res.status(422).send('00000');
  }

  const { tradeNo, status } = parsed;
  const isDup = isDuplicatePayin(tradeNo, status);
  const duplicateCheckResult = isDup ? 'DUPLICATE' : 'NEW';

  payinWebhookLogger.info('Payin webhook received', {
    timestamp,
    traceId,
    sourceIP,
    headers: JSON.stringify(headers),
    rawBody: JSON.stringify(rawBody),
    encryptedPayload,
    receivedSign,
    verificationResult,
    decryptedPayload: decrypted,
    duplicateCheckResult,
    responseReturned: isDup ? '00000' : 'success',
  });

  printPayinWebhook({
    traceId,
    timestamp,
    sourceIP,
    receivedSign,
    verificationResult,
    duplicateCheckResult,
    decryptedPayload: decrypted,
  });

  if (isDup) {
    return res.status(200).send('00000');
  }

  markPayinProcessed(tradeNo, status);
  return res.status(200).send('success');
}

async function handlePayoutWebhook(req, res) {
  const traceId = req.traceId;
  const timestamp = new Date().toISOString();
  const sourceIP = req.ip || req.connection.remoteAddress;
  const headers = req.headers;
  const rawBody = req.body;

  const encryptedPayload = rawBody.payload || null;
  const receivedSign = rawBody.sign || null;

  if (!encryptedPayload || !receivedSign) {
    payoutErrorLogger.error('Payout webhook missing payload or sign', {
      traceId,
      timestamp,
      sourceIP,
      rawBody,
    });
    return res.status(400).send('00000');
  }

  let config;
  try {
    config = getConfig();
  } catch (err) {
    systemErrorLogger.error('Config error in payout webhook', { traceId, error: err.message });
    return res.status(500).send('00000');
  }

  const signValid = verifySignature(encryptedPayload, receivedSign, config.signKey);
  const verificationResult = signValid ? 'VALID' : 'INVALID';

  if (!signValid) {
    payoutErrorLogger.error('Payout webhook invalid signature', {
      timestamp,
      traceId,
      sourceIP,
      encryptedPayload,
      receivedSign,
      verificationResult,
    });
    printPayoutWebhook({
      traceId,
      timestamp,
      sourceIP,
      receivedSign,
      verificationResult,
      duplicateCheckResult: 'N/A',
      decryptedPayload: 'N/A',
    });
    return res.status(400).send('00000');
  }

  let decrypted;
  let parsed;

  try {
    decrypted = decryptPayload(encryptedPayload);
    parsed = JSON.parse(decrypted);
  } catch (err) {
    payoutErrorLogger.error('Payout webhook decryption failed', {
      timestamp,
      traceId,
      sourceIP,
      encryptedPayload,
      errorMessage: err.message,
      stackTrace: err.stack,
    });
    return res.status(400).send('00000');
  }

  try {
    validatePayoutWebhook(parsed);
  } catch (err) {
    payoutErrorLogger.error('Payout webhook validation failed', {
      timestamp,
      traceId,
      sourceIP,
      decryptedPayload: decrypted,
      errorMessage: err.message,
      details: err.details,
    });
    return res.status(422).send('00000');
  }

  const { tradeNo, status } = parsed;
  const isDup = isDuplicatePayout(tradeNo, status);
  const duplicateCheckResult = isDup ? 'DUPLICATE' : 'NEW';

  payoutWebhookLogger.info('Payout webhook received', {
    timestamp,
    traceId,
    sourceIP,
    headers: JSON.stringify(headers),
    rawBody: JSON.stringify(rawBody),
    encryptedPayload,
    receivedSign,
    verificationResult,
    decryptedPayload: decrypted,
    duplicateCheckResult,
    responseReturned: isDup ? '00000' : 'success',
  });

  printPayoutWebhook({
    traceId,
    timestamp,
    sourceIP,
    receivedSign,
    verificationResult,
    duplicateCheckResult,
    decryptedPayload: decrypted,
  });

  if (isDup) {
    return res.status(200).send('00000');
  }

  markPayoutProcessed(tradeNo, status);
  return res.status(200).send('success');
}

router.post('/payin', handlePayinWebhook);
router.post('/payout', handlePayoutWebhook);

module.exports = router;
