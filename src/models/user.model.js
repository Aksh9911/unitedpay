'use strict';

const { pool } = require('../config/db.config');
const { appLogger } = require('../utils/logger');

async function getUserStatus(userId) {
  const sql = `SELECT status FROM users WHERE id = ? LIMIT 1`;
  try {
    const [rows] = await pool.execute(sql, [userId]);
    return rows[0]?.status ?? null;
  } catch (err) {
    appLogger.error('Failed to fetch user status', { error: err.message, userId });
    throw err;
  }
}

module.exports = { getUserStatus };
