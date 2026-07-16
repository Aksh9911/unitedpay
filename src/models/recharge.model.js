'use strict';

const { pool } = require('../config/db.config');
const { appLogger } = require('../utils/logger');

function generateMobile() {
  return String(Math.floor(6000000000 + Math.random() * 3999999999));
}

async function insertRecharge({ rechargeId, orderId, userId, amount }) {
  // Store IST date/time — toISOString() is UTC and rolls date back before 05:30 IST
  const now = new Date();
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const date = ist.toISOString().slice(0, 10);
  const time = ist.toISOString().slice(11, 19);

  const sql = `
    INSERT INTO recharge
      (recharge_id, order_id, userId, user_mobile, recharge_amount, recharge_type, payment_mode, date, time, recharge_status, isDepAdded)
    VALUES
      (?, ?, ?, ?, ?, 'INR', 'unitedpay', ?, ?, 'pending', 0)
  `;

  const params = [rechargeId, orderId, userId, generateMobile(), amount, date, time];

  try {
    const [result] = await pool.execute(sql, params);
    appLogger.info('Recharge record inserted', { rechargeId, orderId, userId, amount });
    return result;
  } catch (err) {
    appLogger.error('Failed to insert recharge record', { error: err.message, rechargeId, orderId });
    throw err;
  }
}

async function updateRechargeStatus(orderId, status) {
  const sql = `UPDATE recharge SET recharge_status = ? WHERE order_id = ?`;
  try {
    const [result] = await pool.execute(sql, [status, orderId]);
    appLogger.info('Recharge status updated', { orderId, status });
    return result;
  } catch (err) {
    appLogger.error('Failed to update recharge status', { error: err.message, orderId, status });
    throw err;
  }
}

async function getRechargeByOrderId(orderId) {
  const sql = `SELECT * FROM recharge WHERE order_id = ? LIMIT 1`;
  try {
    const [rows] = await pool.execute(sql, [orderId]);
    return rows[0] || null;
  } catch (err) {
    appLogger.error('Failed to fetch recharge record', { error: err.message, orderId });
    throw err;
  }
}

module.exports = { insertRecharge, updateRechargeStatus, getRechargeByOrderId };
