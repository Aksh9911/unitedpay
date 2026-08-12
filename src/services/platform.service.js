'use strict';

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { appLogger, systemErrorLogger } = require('../utils/logger');

const PLATFORM_BASE_URL = process.env.PLATFORM_API_BASE_URL || 'https://api.rollix777.com';

function getPlatformHeaders(traceId) {
  return {
    'Content-Type': 'application/json',
    'X-Correlation-ID': traceId || uuidv4(),
  };
}

async function createDepositRecord({ userId, amount, orderId, traceId }) {
  const url = `${PLATFORM_BASE_URL}/api/user/deposit`;
  const body = {
    userId,
    amount,
    cryptoname: 'INR',
    orderid: orderId,
  };

  appLogger.info('Platform API: createDepositRecord request', {
    traceId,
    url,
    body,
    timestamp: new Date().toISOString(),
  });

  const SEP = '====================================';
  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — CREATE DEPOSIT');
  console.log(SEP);
  console.log(`  TraceId : ${traceId}`);
  console.log(`  UserId  : ${userId}`);
  console.log(`  OrderId : ${orderId}`);
  console.log(`  Amount  : ${amount}`);
  console.log(`  URL     : POST ${url}`);
  console.log(`${SEP}\n`);

  const response = await axios.post(url, body, {
    headers: getPlatformHeaders(traceId),
    timeout: 15000,
  });

  appLogger.info('Platform API: createDepositRecord response', {
    traceId,
    orderId,
    httpStatus: response.status,
    data: response.data,
    timestamp: new Date().toISOString(),
  });

  const SEP2 = '====================================';
  console.log(`\n${SEP2}`);
  console.log('  PLATFORM API — DEPOSIT RAW RESPONSE');
  console.log(SEP2);
  console.log(`  TraceId    : ${traceId}`);
  console.log(`  OrderId    : ${orderId}`);
  console.log(`  HttpStatus : ${response.status}`);
  console.log(`  RawData    : ${JSON.stringify(response.data)}`);
  console.log(`${SEP2}\n`);

  if (response.status !== 200 || !response.data || !response.data.message) {
    const err = new Error(`Platform deposit API failed for orderId: ${orderId}`);
    err.code = 'PLATFORM_DEPOSIT_FAILED';
    err.responseData = response.data;
    throw err;
  }

  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — DEPOSIT CREATED ✓');
  console.log(SEP);
  console.log(`  TraceId : ${traceId}`);
  console.log(`  OrderId : ${orderId}`);
  console.log(`  Response: ${JSON.stringify(response.data)}`);
  console.log(`${SEP}\n`);

  return response.data;
}

async function updateWalletBalance({ userId, amount, cryptoname = 'INR', traceId }) {
  const url = `${PLATFORM_BASE_URL}/api/user/wallet/balance`;
  const body = {
    userId,
    cryptoname: cryptoname || 'INR',
    balance: amount,
  };

  appLogger.info('Platform API: updateWalletBalance request', {
    traceId,
    url,
    body,
    timestamp: new Date().toISOString(),
  });

  const SEP = '====================================';
  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — UPDATE WALLET');
  console.log(SEP);
  console.log(`  TraceId : ${traceId}`);
  console.log(`  UserId  : ${userId}`);
  console.log(`  Amount  : ${amount}`);
  console.log(`  URL     : PUT ${url}`);
  console.log(`${SEP}\n`);

  const response = await axios.put(url, body, {
    headers: getPlatformHeaders(traceId),
    timeout: 15000,
  });

  appLogger.info('Platform API: updateWalletBalance response', {
    traceId,
    userId,
    status: response.status,
    data: response.data,
    timestamp: new Date().toISOString(),
  });

  if (response.status !== 200 || !response.data || !response.data.message) {
    const err = new Error(`Platform wallet API failed for userId: ${userId}`);
    err.code = 'PLATFORM_WALLET_FAILED';
    err.responseData = response.data;
    throw err;
  }

  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — WALLET UPDATED ✓');
  console.log(SEP);
  console.log(`  TraceId : ${traceId}`);
  console.log(`  UserId  : ${userId}`);
  console.log(`  Response: ${JSON.stringify(response.data)}`);
  console.log(`${SEP}\n`);

  return response.data;
}

async function processDepositSuccess({ userId, amount, orderId, traceId }) {
  const SEP = '====================================';
  const bonusAmount = parseFloat((amount * 1.1).toFixed(2));

  let depositResult;
  try {
    depositResult = await createDepositRecord({ userId, amount, orderId, traceId });
  } catch (err) {
    systemErrorLogger.error('Platform deposit creation failed — wallet NOT updated', {
      traceId,
      orderId,
      userId,
      amount,
      errorType: err.code || 'PLATFORM_DEPOSIT_ERROR',
      errorMessage: err.message,
      stackTrace: err.stack,
      timestamp: new Date().toISOString(),
    });
    console.error(`\n[CRITICAL] Platform deposit API failed. Wallet NOT credited.`);
    console.error(`  OrderId      : ${orderId}`);
    console.error(`  Error        : ${err.message}`);
    console.error(`  ResponseData : ${JSON.stringify(err.responseData || null)}\n`);
    return { depositCreated: false, walletUpdated: false };
  }

  try {
    await updateWalletBalance({ userId, amount: bonusAmount, traceId });
    return { depositCreated: true, walletUpdated: true };
  } catch (err) {
    systemErrorLogger.error('platform_deposit_wallet_mismatch — deposit created but wallet NOT credited', {
      traceId,
      orderId,
      userId,
      amount,
      errorType: 'platform_deposit_wallet_mismatch',
      errorMessage: err.message,
      stackTrace: err.stack,
      timestamp: new Date().toISOString(),
      action: 'MANUAL_INTERVENTION_REQUIRED',
    });
    console.error(`\n${SEP}`);
    console.error('  [CRITICAL] platform_deposit_wallet_mismatch');
    console.error(SEP);
    console.error(`  OrderId : ${orderId}`);
    console.error(`  UserId  : ${userId}`);
    console.error(`  Amount  : ${amount}`);
    console.error(`  Deposit record EXISTS but wallet NOT credited.`);
    console.error(`  *** MANUAL INTERVENTION REQUIRED ***`);
    console.error(`${SEP}\n`);
    return { depositCreated: true, walletUpdated: false };
  }
}

/**
 * Refund withdrawn amount on payout reject/fail via PUT /api/user/wallet/balance
 * (same add-funds API as payin — exact amount, no bonus).
 */
async function refundFailedPayout({ userId, amount, cryptoname = 'INR', withdrawId, morderId, traceId }) {
  const SEP = '====================================';
  const refundAmount = Number(amount);

  appLogger.info('Platform API: refundFailedPayout start', {
    traceId,
    userId,
    amount: refundAmount,
    cryptoname,
    withdrawId,
    morderId,
    timestamp: new Date().toISOString(),
  });

  console.log(`\n${SEP}`);
  console.log('  PLATFORM API — PAYOUT REFUND');
  console.log(SEP);
  console.log(`  TraceId    : ${traceId}`);
  console.log(`  UserId     : ${userId}`);
  console.log(`  WithdrawId : ${withdrawId}`);
  console.log(`  MorderId   : ${morderId}`);
  console.log(`  Amount     : ${refundAmount}`);
  console.log(`${SEP}\n`);

  try {
    const result = await updateWalletBalance({
      userId,
      amount: refundAmount,
      cryptoname,
      traceId,
    });

    appLogger.info('Platform API: refundFailedPayout success', {
      traceId,
      userId,
      amount: refundAmount,
      withdrawId,
      morderId,
      response: result,
      timestamp: new Date().toISOString(),
    });

    console.log(`\n${SEP}`);
    console.log('  PLATFORM API — PAYOUT REFUND ✓');
    console.log(SEP);
    console.log(`  TraceId    : ${traceId}`);
    console.log(`  UserId     : ${userId}`);
    console.log(`  Amount     : ${refundAmount}`);
    console.log(`${SEP}\n`);

    return { success: true, data: result };
  } catch (err) {
    systemErrorLogger.error('Platform payout refund failed', {
      traceId,
      userId,
      amount: refundAmount,
      withdrawId,
      morderId,
      errorType: err.code || 'PLATFORM_REFUND_ERROR',
      errorMessage: err.message,
      stackTrace: err.stack,
      timestamp: new Date().toISOString(),
      action: 'MANUAL_INTERVENTION_REQUIRED',
    });

    console.error(`\n${SEP}`);
    console.error('  [CRITICAL] PLATFORM PAYOUT REFUND FAILED');
    console.error(SEP);
    console.error(`  TraceId    : ${traceId}`);
    console.error(`  UserId     : ${userId}`);
    console.error(`  WithdrawId : ${withdrawId}`);
    console.error(`  Amount     : ${refundAmount}`);
    console.error(`  Error      : ${err.message}`);
    console.error(`  *** MANUAL INTERVENTION REQUIRED ***`);
    console.error(`${SEP}\n`);

    throw err;
  }
}

module.exports = {
  processDepositSuccess,
  createDepositRecord,
  updateWalletBalance,
  refundFailedPayout,
};
