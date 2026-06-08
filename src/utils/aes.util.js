'use strict';

const crypto = require('crypto');

const ALGORITHM = 'aes-128-cbc';
const IV = Buffer.from('0102030405060708', 'utf-8');
const ENCODING = 'utf-8';

function getKey() {
  const key = process.env.UNITEDPAY_ENC_KEY;
  if (!key) throw new Error('UNITEDPAY_ENC_KEY is not set');
  return Buffer.from(key, ENCODING).slice(0, 16);
}

function encryptPayload(data) {
  try {
    const text = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const key = getKey();
    const cipher = crypto.createCipheriv(ALGORITHM, key, IV);
    cipher.setAutoPadding(true);
    const encrypted = Buffer.concat([cipher.update(text, ENCODING), cipher.final()]);
    return encrypted.toString('base64');
  } catch (err) {
    const error = new Error(`AES encryption failed: ${err.message}`);
    error.code = 'AES_ENCRYPT_ERROR';
    error.original = err;
    throw error;
  }
}

function decryptPayload(payload) {
  try {
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, IV);
    decipher.setAutoPadding(true);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload, 'base64')),
      decipher.final(),
    ]);
    return decrypted.toString(ENCODING);
  } catch (err) {
    const error = new Error(`AES decryption failed: ${err.message}`);
    error.code = 'AES_DECRYPT_ERROR';
    error.original = err;
    throw error;
  }
}

module.exports = { encryptPayload, decryptPayload };
