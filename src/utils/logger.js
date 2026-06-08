'use strict';

const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOGS_ROOT = path.join(process.cwd(), 'logs');

const DIRS = [
  path.join(LOGS_ROOT, 'payin'),
  path.join(LOGS_ROOT, 'payout'),
  path.join(LOGS_ROOT, 'system'),
];

for (const dir of DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level}: ${message}`)
);

function createDailyTransport(filePath, level = 'debug') {
  return new DailyRotateFile({
    filename: filePath,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxFiles: '30d',
    level,
    format: jsonFormat,
  });
}

const payinRequestLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payin', 'payin-requests-%DATE%.log')),
  ],
});

const payinResponseLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payin', 'payin-responses-%DATE%.log')),
  ],
});

const payinWebhookLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payin', 'payin-webhooks-%DATE%.log')),
  ],
});

const payinErrorLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payin', 'payin-errors-%DATE%.log'), 'error'),
  ],
});

const payoutRequestLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-requests-%DATE%.log')),
  ],
});

const payoutResponseLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-responses-%DATE%.log')),
  ],
});

const payoutWebhookLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-webhooks-%DATE%.log')),
  ],
});

const payoutErrorLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'payout', 'payout-errors-%DATE%.log'), 'error'),
  ],
});

const appLogger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'system', 'application-%DATE%.log')),
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

const systemErrorLogger = winston.createLogger({
  level: 'error',
  transports: [
    createDailyTransport(path.join(LOGS_ROOT, 'system', 'errors-%DATE%.log'), 'error'),
    new winston.transports.Console({ format: consoleFormat }),
  ],
});

const SEP = '====================================';

function printPayinRequest(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY PAYIN REQUEST',
    SEP,
    `TraceId         : ${ctx.traceId}`,
    `Timestamp       : ${ctx.timestamp}`,
    `Endpoint        : ${ctx.endpoint}`,
    `TradeNo         : ${ctx.tradeNo}`,
    `Amount          : ${ctx.amount}`,
    `EncryptedPayload: ${ctx.encryptedPayload}`,
    `GeneratedSign   : ${ctx.generatedSign}`,
    `DecryptedPayload: ${ctx.decryptedPayload}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayinResponse(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY PAYIN RESPONSE',
    SEP,
    `TraceId           : ${ctx.traceId}`,
    `Timestamp         : ${ctx.timestamp}`,
    `TradeNo           : ${ctx.tradeNo}`,
    `HttpStatus        : ${ctx.httpStatus}`,
    `EncryptedResponse : ${ctx.encryptedResponse}`,
    `ReceivedSign      : ${ctx.receivedSign}`,
    `VerificationResult: ${ctx.verificationResult}`,
    `DecryptedResponse : ${ctx.decryptedResponse}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayoutRequest(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY PAYOUT REQUEST',
    SEP,
    `TraceId         : ${ctx.traceId}`,
    `Timestamp       : ${ctx.timestamp}`,
    `Endpoint        : ${ctx.endpoint}`,
    `TradeNo         : ${ctx.tradeNo}`,
    `Amount          : ${ctx.amount}`,
    `EncryptedPayload: ${ctx.encryptedPayload}`,
    `GeneratedSign   : ${ctx.generatedSign}`,
    `DecryptedPayload: ${ctx.decryptedPayload}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayoutResponse(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY PAYOUT RESPONSE',
    SEP,
    `TraceId           : ${ctx.traceId}`,
    `Timestamp         : ${ctx.timestamp}`,
    `TradeNo           : ${ctx.tradeNo}`,
    `HttpStatus        : ${ctx.httpStatus}`,
    `EncryptedResponse : ${ctx.encryptedResponse}`,
    `ReceivedSign      : ${ctx.receivedSign}`,
    `VerificationResult: ${ctx.verificationResult}`,
    `DecryptedResponse : ${ctx.decryptedResponse}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printBalanceQuery(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY BALANCE QUERY',
    SEP,
    `TraceId         : ${ctx.traceId}`,
    `Timestamp       : ${ctx.timestamp}`,
    `Endpoint        : ${ctx.endpoint}`,
    `EncryptedPayload: ${ctx.encryptedPayload}`,
    `GeneratedSign   : ${ctx.generatedSign}`,
    `DecryptedPayload: ${ctx.decryptedPayload}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayinWebhook(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY PAYIN WEBHOOK',
    SEP,
    `TraceId             : ${ctx.traceId}`,
    `Timestamp           : ${ctx.timestamp}`,
    `SourceIP            : ${ctx.sourceIP}`,
    `ReceivedSign        : ${ctx.receivedSign}`,
    `VerificationResult  : ${ctx.verificationResult}`,
    `DuplicateCheckResult: ${ctx.duplicateCheckResult}`,
    `DecryptedPayload    : ${ctx.decryptedPayload}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printPayoutWebhook(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY PAYOUT WEBHOOK',
    SEP,
    `TraceId             : ${ctx.traceId}`,
    `Timestamp           : ${ctx.timestamp}`,
    `SourceIP            : ${ctx.sourceIP}`,
    `ReceivedSign        : ${ctx.receivedSign}`,
    `VerificationResult  : ${ctx.verificationResult}`,
    `DuplicateCheckResult: ${ctx.duplicateCheckResult}`,
    `DecryptedPayload    : ${ctx.decryptedPayload}`,
    SEP,
  ];
  appLogger.info(lines.join('\n'));
}

function printError(ctx) {
  const lines = [
    SEP,
    'UNITEDPAY ERROR',
    SEP,
    `TraceId     : ${ctx.traceId}`,
    `Timestamp   : ${ctx.timestamp}`,
    `Module      : ${ctx.module}`,
    `Endpoint    : ${ctx.endpoint}`,
    `TradeNo     : ${ctx.tradeNo}`,
    `ErrorType   : ${ctx.errorType}`,
    `ErrorMessage: ${ctx.errorMessage}`,
    SEP,
  ];
  systemErrorLogger.error(lines.join('\n'));
}

module.exports = {
  appLogger,
  systemErrorLogger,
  payinRequestLogger,
  payinResponseLogger,
  payinWebhookLogger,
  payinErrorLogger,
  payoutRequestLogger,
  payoutResponseLogger,
  payoutWebhookLogger,
  payoutErrorLogger,
  printPayinRequest,
  printPayinResponse,
  printPayoutRequest,
  printPayoutResponse,
  printBalanceQuery,
  printPayinWebhook,
  printPayoutWebhook,
  printError,
};
