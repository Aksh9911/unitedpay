'use strict';

const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const traceIdMiddleware = require('./middleware/traceId');
const requestLogger = require('./middleware/requestLogger');
const errorHandler = require('./middleware/errorHandler');
const unitedpayRoutes = require('./routes/unitedpay.routes');
const webhookRoutes = require('./webhooks/unitedpay.webhook');

app.use(traceIdMiddleware);
app.use(requestLogger);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'unitedpay-gateway',
    timestamp: new Date().toISOString(),
    traceId: req.traceId,
  });
});

app.use('/api/unitedpay', unitedpayRoutes);
app.use('/webhooks/unitedpay', webhookRoutes);

app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    traceId: req.traceId,
  });
});

app.use(errorHandler);

module.exports = app;
