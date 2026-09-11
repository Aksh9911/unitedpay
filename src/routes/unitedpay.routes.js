'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/unitedpay.controller');
const { payinRateLimiter, userRechargeGuard } = require('../middleware/payinGuard');
const { requirePayoutSecret } = require('../middleware/requirePayoutSecret');

router.post('/payin/create', payinRateLimiter, userRechargeGuard, controller.payinCreate);
router.post('/payin/query', controller.payinQuery);
router.post('/payout/create', requirePayoutSecret, controller.payoutCreate);
router.post('/payout/query', controller.payoutQuery);
router.post('/balance', controller.balanceQuery);

module.exports = router;
