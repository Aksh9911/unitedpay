'use strict';

require('dotenv').config();

const app = require('./app');
const { appLogger, systemErrorLogger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

process.on('uncaughtException', (err) => {
  systemErrorLogger.error('Uncaught exception', {
    errorType: 'UncaughtException',
    errorMessage: err.message,
    stackTrace: err.stack,
    timestamp: new Date().toISOString(),
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  systemErrorLogger.error('Unhandled promise rejection', {
    errorType: 'UnhandledRejection',
    errorMessage: reason instanceof Error ? reason.message : String(reason),
    stackTrace: reason instanceof Error ? reason.stack : null,
    timestamp: new Date().toISOString(),
  });
});

async function start() {
  try {
    const { getConfig } = require('./config/unitedpay.config');
    getConfig();

    const server = app.listen(PORT, () => {
      appLogger.info(`UnitedPay Gateway started`, {
        port: PORT,
        env: NODE_ENV,
        timestamp: new Date().toISOString(),
      });

      const SEP = '====================================';
      console.log(`\n${SEP}`);
      console.log('  UNITEDPAY GATEWAY STARTED');
      console.log(SEP);
      console.log(`  Port        : ${PORT}`);
      console.log(`  Environment : ${NODE_ENV}`);
      console.log(`  Health      : http://localhost:${PORT}/health`);
      console.log(SEP);
      console.log('  PAYIN  ENDPOINTS');
      console.log(`    POST /api/unitedpay/payin/create`);
      console.log(`    POST /api/unitedpay/payin/query`);
      console.log(SEP);
      console.log('  PAYOUT ENDPOINTS');
      console.log(`    POST /api/unitedpay/payout/create`);
      console.log(`    POST /api/unitedpay/payout/query`);
      console.log(SEP);
      console.log('  BALANCE ENDPOINT');
      console.log(`    POST /api/unitedpay/balance`);
      console.log(SEP);
      console.log('  WEBHOOK ENDPOINTS');
      console.log(`    POST /webhooks/unitedpay/payin`);
      console.log(`    POST /webhooks/unitedpay/payout`);
      console.log(`${SEP}\n`);
    });

    const shutdown = async (signal) => {
      appLogger.info(`Received ${signal}. Graceful shutdown initiated.`);
      server.close(() => {
        appLogger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    systemErrorLogger.error('Failed to start server', {
      errorType: 'StartupError',
      errorMessage: err.message,
      stackTrace: err.stack,
      timestamp: new Date().toISOString(),
    });
    console.error(`\n[FATAL] Server failed to start: ${err.message}\n`);
    process.exit(1);
  }
}

start();
