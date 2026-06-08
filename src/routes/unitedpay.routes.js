'use strict';

const express = require('express');
const router = express.Router();
const controller = require('../controllers/unitedpay.controller');

router.post('/payin/create', controller.payinCreate);
router.post('/payin/query', controller.payinQuery);
router.post('/payout/create', controller.payoutCreate);
router.post('/payout/query', controller.payoutQuery);
router.post('/balance', controller.balanceQuery);

module.exports = router;
