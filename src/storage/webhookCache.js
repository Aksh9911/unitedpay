'use strict';

const payinCache = new Map();
const payoutCache = new Map();

const TTL_MS = 24 * 60 * 60 * 1000;

function buildKey(tradeNo, status) {
  return `${tradeNo}:${status}`;
}

function isDuplicatePayin(tradeNo, status) {
  const key = buildKey(tradeNo, status);
  const entry = payinCache.get(key);
  if (entry && Date.now() - entry.timestamp < TTL_MS) {
    return true;
  }
  return false;
}

function markPayinProcessed(tradeNo, status) {
  const key = buildKey(tradeNo, status);
  payinCache.set(key, { timestamp: Date.now() });
}

function isDuplicatePayout(tradeNo, status) {
  const key = buildKey(tradeNo, status);
  const entry = payoutCache.get(key);
  if (entry && Date.now() - entry.timestamp < TTL_MS) {
    return true;
  }
  return false;
}

function markPayoutProcessed(tradeNo, status) {
  const key = buildKey(tradeNo, status);
  payoutCache.set(key, { timestamp: Date.now() });
}

function getPayinCacheSize() {
  return payinCache.size;
}

function getPayoutCacheSize() {
  return payoutCache.size;
}

module.exports = {
  isDuplicatePayin,
  markPayinProcessed,
  isDuplicatePayout,
  markPayoutProcessed,
  getPayinCacheSize,
  getPayoutCacheSize,
};
