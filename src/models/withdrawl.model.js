'use strict';

const { pool } = require('../config/db.config');
const { appLogger } = require('../utils/logger');

async function insertWithdrawl({ withdrawId, tradeNo }) {
  const sql = `INSERT INTO withdrawl (withdrawId, morder_id) VALUES (?, ?)`;
  const params = [withdrawId, tradeNo];

  try {
    const [result] = await pool.execute(sql, params);
    appLogger.info('Withdrawl record inserted', { withdrawId, tradeNo });
    return result;
  } catch (err) {
    appLogger.error('Failed to insert withdrawl record', { error: err.message, withdrawId, tradeNo });
    throw err;
  }
}

async function getWithdrawlByWithdrawId(withdrawId) {
  const sql = `SELECT * FROM withdrawl WHERE withdrawId = ? LIMIT 1`;
  try {
    const [rows] = await pool.execute(sql, [withdrawId]);
    return rows[0] || null;
  } catch (err) {
    appLogger.error('Failed to fetch withdrawl record', { error: err.message, withdrawId });
    throw err;
  }
}

async function updateWithdrawlStatusByTradeNo(tradeNo, status) {
  const sql = `UPDATE withdrawl SET status = ? WHERE morder_id = ?`;
  try {
    const [result] = await pool.execute(sql, [status, tradeNo]);
    appLogger.info('Withdrawl status updated', { tradeNo, status });
    return result;
  } catch (err) {
    appLogger.error('Failed to update withdrawl status', { error: err.message, tradeNo, status });
    throw err;
  }
}

module.exports = { insertWithdrawl, getWithdrawlByWithdrawId, updateWithdrawlStatusByTradeNo };
