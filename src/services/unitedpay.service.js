'use strict';

const axios = require('axios');
const { getConfig } = require('../config/unitedpay.config');
const { insertRecharge } = require('../models/recharge.model');
const { insertWithdrawl } = require('../models/withdrawl.model');
const { encryptPayload, decryptPayload } = require('../utils/aes.util');
const { generateSignature, verifySignature } = require('../utils/signature.util');
const { generateTradeNo } = require('../utils/tradeNo.util');
const { maskSensitiveData } = require('../utils/mask.util');
const {
  appLogger,
  payinRequestLogger,
  payinResponseLogger,
  payoutRequestLogger,
  payoutResponseLogger,
  payinErrorLogger,
  payoutErrorLogger,
  systemErrorLogger,
  printPayinRequest,
  printPayinResponse,
  printPayoutRequest,
  printPayoutResponse,
  printBalanceQuery,
} = require('../utils/logger');

function currentTimestamp() {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30 in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  const pad = (n) => String(n).padStart(2, '0');
  return `${istTime.getFullYear()}${pad(istTime.getMonth() + 1)}${pad(istTime.getDate())}${pad(istTime.getHours())}${pad(istTime.getMinutes())}${pad(istTime.getSeconds())}`;
}

async function sendUnitedPayRequest({ endpoint, innerPayload, traceId, logType }) {
  const config = getConfig();
  const url = `${config.baseUrl}${endpoint}`;
  const isDebug = process.env.LOG_LEVEL === 'debug';

  const innerWithMch = { ...innerPayload, mchNo: config.mchNo };
  const encryptedPayload = encryptPayload(innerWithMch);
  const sign = generateSignature(encryptedPayload, config.signKey);

  const requestBody = {
    mchNo: config.mchNo,
    payload: encryptedPayload,
    sign,
  };

  const decryptedStr = isDebug ? JSON.stringify(maskSensitiveData(innerWithMch)) : '[DEBUG_OFF]';
  const timestamp = new Date().toISOString();

  const reqLogEntry = {
    timestamp,
    traceId,
    tradeNo: innerPayload.tradeNo || 'N/A',
    merchantNo: config.mchNo,
    amount: innerPayload.price || 'N/A',
    endpoint,
    encryptedPayload,
    generatedSign: sign,
    decryptedPayload: decryptedStr,
    requestBody: isDebug ? JSON.stringify(requestBody) : '[DEBUG_OFF]',
  };

  if (logType === 'payin') {
    payinRequestLogger.info('Payin request', reqLogEntry);
    printPayinRequest({
      traceId,
      timestamp,
      endpoint,
      tradeNo: innerPayload.tradeNo || 'N/A',
      amount: innerPayload.price || 'N/A',
      encryptedPayload,
      generatedSign: sign,
      decryptedPayload: decryptedStr,
    });
  } else if (logType === 'payout') {
    payoutRequestLogger.info('Payout request', reqLogEntry);
    printPayoutRequest({
      traceId,
      timestamp,
      endpoint,
      tradeNo: innerPayload.tradeNo || 'N/A',
      amount: innerPayload.price || 'N/A',
      encryptedPayload,
      generatedSign: sign,
      decryptedPayload: decryptedStr,
    });
  } else {
    appLogger.info('Balance query request', reqLogEntry);
    printBalanceQuery({
      traceId,
      timestamp,
      endpoint,
      encryptedPayload,
      generatedSign: sign,
      decryptedPayload: decryptedStr,
    });
  }

  const startTime = Date.now();
  let axiosResponse;

  try {
    axiosResponse = await axios.post(url, requestBody, {
      timeout: config.timeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (axiosErr) {
    const isTimeout = axiosErr.code === 'ECONNABORTED' || axiosErr.message.includes('timeout');
    const errorResponse = axiosErr.response?.data || null;
    const httpStatus = axiosErr.response?.status || null;
    
    // Log the actual error response from UnitedPay
    console.error(`\n====================================`);
    console.error(`  UNITEDPAY API ERROR RESPONSE`);
    console.error(`====================================`);
    console.error(`  TraceId    : ${traceId}`);
    console.error(`  Endpoint   : ${endpoint}`);
    console.error(`  HttpStatus : ${httpStatus}`);
    console.error(`  Error      : ${axiosErr.message}`);
    console.error(`  RawResp    : ${JSON.stringify(errorResponse)}`);
    console.error(`====================================\n`);

    const err = new Error(isTimeout ? `Request timeout: ${endpoint}` : `Remote API call failed: ${axiosErr.message}`);
    err.code = isTimeout ? 'REMOTE_TIMEOUT' : 'REMOTE_API_ERROR';
    err.original = axiosErr;

    const errEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      module: logType.toUpperCase(),
      endpoint,
      tradeNo: innerPayload.tradeNo || 'N/A',
      errorType: err.code,
      errorMessage: err.message,
      stackTrace: err.stack,
      requestPayload: reqLogEntry,
      responsePayload: errorResponse,
      httpStatus,
    };
    if (logType === 'payin') payinErrorLogger.error('Payin request failed', errEntry);
    else if (logType === 'payout') payoutErrorLogger.error('Payout request failed', errEntry);
    systemErrorLogger.error('API call failed', errEntry);
    throw err;
  }

  const processingTime = Date.now() - startTime;
  const responseData = axiosResponse.data;

  // Log the raw response from UnitedPay for debugging
  console.log(`\n====================================`);
  console.log(`  UNITEDPAY RAW RESPONSE DATA`);
  console.log(`====================================`);
  console.log(`  TraceId    : ${traceId}`);
  console.log(`  HttpStatus : ${axiosResponse.status}`);
  console.log(`  RawData    : ${JSON.stringify(responseData)}`);
  console.log(`====================================\n`);

  // Check if this is an error response (different format)
  if (responseData.state === 'Failed' || responseData.code) {
    console.error(`\n[ERROR] UnitedPay returned error response`);
    console.error(`  State   : ${responseData.state}`);
    console.error(`  Message : ${responseData.message}`);
    console.error(`  Code    : ${responseData.code}\n`);
    const err = new Error(`UnitedPay error: ${responseData.message} (Code: ${responseData.code})`);
    err.code = 'REMOTE_API_ERROR';
    err.unitedPayCode = responseData.code;
    throw err;
  }

  const encryptedResponse = responseData.payload || null;
  const receivedSign = responseData.sign || null;

  if (!encryptedResponse || !receivedSign) {
    console.error(`\n[ERROR] Missing payload or sign in response`);
    console.error(`  Payload: ${encryptedResponse}`);
    console.error(`  Sign   : ${receivedSign}\n`);
    const err = new Error('Remote response missing payload or sign');
    err.code = 'REMOTE_API_ERROR';
    throw err;
  }

  const signValid = verifySignature(encryptedResponse, receivedSign, config.signKey);

  if (!signValid) {
    const err = new Error('Remote response signature verification failed');
    err.code = 'INVALID_SIGNATURE';

    const errEntry = {
      timestamp: new Date().toISOString(),
      traceId,
      module: logType.toUpperCase(),
      endpoint,
      tradeNo: innerPayload.tradeNo || 'N/A',
      errorType: err.code,
      errorMessage: err.message,
      stackTrace: err.stack,
      requestPayload: reqLogEntry,
      responsePayload: { encryptedResponse, receivedSign },
    };
    if (logType === 'payin') payinErrorLogger.error('Payin signature invalid', errEntry);
    else if (logType === 'payout') payoutErrorLogger.error('Payout signature invalid', errEntry);
    systemErrorLogger.error('Signature verification failed', errEntry);
    throw err;
  }

  const decryptedResponse = decryptPayload(encryptedResponse);
  let parsedResponse;

  try {
    parsedResponse = JSON.parse(decryptedResponse);
  } catch (e) {
    const err = new Error('Failed to parse decrypted response as JSON');
    err.code = 'AES_DECRYPT_ERROR';
    throw err;
  }

  const resLogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    tradeNo: parsedResponse.tradeNo || innerPayload.tradeNo || 'N/A',
    httpStatus: axiosResponse.status,
    encryptedResponse,
    receivedSign,
    verificationResult: 'VALID',
    decryptedResponse: isDebug ? decryptedResponse : '[DEBUG_OFF]',
    completeJson: isDebug ? JSON.stringify(parsedResponse) : '[DEBUG_OFF]',
    processingTime,
  };

  if (logType === 'payin') {
    payinResponseLogger.info('Payin response', resLogEntry);
    printPayinResponse({
      traceId,
      timestamp: resLogEntry.timestamp,
      tradeNo: resLogEntry.tradeNo,
      httpStatus: axiosResponse.status,
      encryptedResponse,
      receivedSign,
      verificationResult: 'VALID',
      decryptedResponse: isDebug ? decryptedResponse : '[DEBUG_OFF]',
    });
  } else if (logType === 'payout') {
    payoutResponseLogger.info('Payout response', resLogEntry);
    printPayoutResponse({
      traceId,
      timestamp: resLogEntry.timestamp,
      tradeNo: resLogEntry.tradeNo,
      httpStatus: axiosResponse.status,
      encryptedResponse,
      receivedSign,
      verificationResult: 'VALID',
      decryptedResponse: isDebug ? decryptedResponse : '[DEBUG_OFF]',
    });
  } else {
    appLogger.info('Balance query response', resLogEntry);
  }

  return parsedResponse;
}

const BLOCKED_USER_IDS = [23414];

async function createPayin(input, traceId) {
  if (BLOCKED_USER_IDS.includes(Number(input.userId))) {
    appLogger.warn('Deposit blocked for userId', { traceId, userId: input.userId });
    const err = new Error('Deposit is blocked for this account.');
    err.code = 'BLOCKED_USER';
    throw err;
  }

  const config = getConfig();
  const tradeNo = input.tradeNo || generateTradeNo();
  const innerPayload = {
    versionNo: '1',
    mchNo: config.mchNo,
    price: input.price,
    orderDate: currentTimestamp(),
    tradeNo,
    notifyUrl: input.notifyUrl || config.notifyUrl,
    callbackUrl: input.callbackUrl || config.callbackUrl,
    payType: input.payType || '01',
    payerName: input.payerName,
    payMobile: input.payMobile,
    payEmail: input.payEmail,
  };

  const result = await sendUnitedPayRequest({
    endpoint: config.endpoints.payinCreate,
    innerPayload,
    traceId,
    logType: 'payin',
  });

  try {
    await insertRecharge({
      rechargeId: tradeNo,
      orderId: tradeNo,
      userId: input.userId,
      amount: input.price,
    });
    const SEP = '====================================';
    console.log(`\n${SEP}`);
    console.log('  RECHARGE TABLE INSERT SUCCESS');
    console.log(SEP);
    console.log(`  TraceId   : ${traceId}`);
    console.log(`  OrderId   : ${tradeNo}`);
    console.log(`  UserId    : ${input.userId}`);
    console.log(`  Amount    : ${input.price}`);
    console.log(`  Status    : pending`);
    console.log(`  Timestamp : ${new Date().toISOString()}`);
    console.log(`${SEP}\n`);
  } catch (dbErr) {
    console.error(`[DB ERROR] Recharge insert failed for OrderId: ${tradeNo} | ${dbErr.message}`);
    appLogger.error('DB insert failed after payin create', {
      traceId,
      tradeNo,
      error: dbErr.message,
    });
  }

  return result;
}

async function queryPayin(input, traceId) {
  const config = getConfig();
  const innerPayload = {
    versionNo: '1',
    mchNo: config.mchNo,
    tradeNo: input.tradeNo,
  };

  const result = await sendUnitedPayRequest({
    endpoint: config.endpoints.payinQuery,
    innerPayload,
    traceId,
    logType: 'payin',
  });

  return result;
}

async function createPayout(input, traceId) {
  const config = getConfig();
  const tradeNo = input.tradeNo || generateTradeNo();
  const innerPayload = {
    versionNo: '1',
    mchNo: config.mchNo,
    price: input.price,
    orderDate: currentTimestamp(),
    tradeNo,
    notifyUrl: input.notifyUrl || config.payoutNotifyUrl,
    mode: input.mode || 'S1',
    accBankCode: input.accBankCode,
    accCardNo: input.accCardNo,
    accName: input.accName,
    accTel: input.accTel,
    accEmail: 'admin@rollix777.com',
    purpose: input.purpose,
  };

  const result = await sendUnitedPayRequest({
    endpoint: config.endpoints.payoutCreate,
    innerPayload,
    traceId,
    logType: 'payout',
  });

  try {
    await insertWithdrawl({
      withdrawId: input.withdrawId,
      tradeNo,
    });
  } catch (dbErr) {
    appLogger.error('DB insert failed after payout create', {
      traceId,
      tradeNo,
      withdrawId: input.withdrawId,
      error: dbErr.message,
    });
  }

  return { ...result, tradeNo };
}

async function queryPayout(input, traceId) {
  const config = getConfig();
  const innerPayload = {
    versionNo: '1',
    mchNo: config.mchNo,
    tradeNo: input.tradeNo,
  };

  const result = await sendUnitedPayRequest({
    endpoint: config.endpoints.payoutQuery,
    innerPayload,
    traceId,
    logType: 'payout',
  });

  return result;
}

async function queryBalance(traceId) {
  const config = getConfig();
  const innerPayload = {
    versionNo: '1',
    mchNo: config.mchNo,
  };

  const result = await sendUnitedPayRequest({
    endpoint: config.endpoints.balanceQuery,
    innerPayload,
    traceId,
    logType: 'balance',
  });

  return {
    versionNo: result.versionNo,
    mchNo: result.mchNo,
    settleInAmt: result.settleInAmt,
    settleOutAmt: result.settleOutAmt,
    curInAmt: result.curInAmt,
    creditLines: result.creditLines,
    curOutAmt: result.curOutAmt,
    curAvailable: result.curAvailable,
  };
}

module.exports = {
  createPayin,
  queryPayin,
  createPayout,
  queryPayout,
  queryBalance,
  sendUnitedPayRequest,
};
