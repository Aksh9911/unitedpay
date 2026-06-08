'use strict';

const crypto = require('crypto');

function generateSignature(payload, signKey) {
  if (!payload || !signKey) {
    throw new Error('payload and signKey are required to generate signature');
  }
  const raw = `${payload}${signKey}`;
  return crypto.createHash('md5').update(raw, 'utf-8').digest('hex').toUpperCase();
}

function verifySignature(payload, sign, signKey) {
  if (!payload || !sign || !signKey) {
    return false;
  }
  const expected = generateSignature(payload, signKey);
  return expected === sign.toUpperCase();
}

module.exports = { generateSignature, verifySignature };
