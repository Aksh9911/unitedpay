'use strict';

function maskAccountNumber(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

function maskMobile(value) {
  if (!value || typeof value !== 'string') return value;
  if (value.length <= 4) return '****';
  return '*'.repeat(value.length - 4) + value.slice(-4);
}

function maskEmail(value) {
  if (!value || typeof value !== 'string') return value;
  const atIdx = value.indexOf('@');
  if (atIdx <= 0) return '***@***';
  const localPart = value.slice(0, atIdx);
  const domain = value.slice(atIdx);
  const visible = localPart.slice(0, 1);
  return `${visible}***${domain}`;
}

function maskSensitiveData(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const isProduction = process.env.NODE_ENV === 'production';
  const masked = Array.isArray(obj) ? [] : {};

  for (const key of Object.keys(obj)) {
    const val = obj[key];
    const keyLower = key.toLowerCase();

    if (keyLower === 'signkey' || keyLower === 'sign_key' || keyLower === 'enckey' || keyLower === 'enc_key') {
      masked[key] = '[REDACTED]';
    } else if ((keyLower.includes('cardno') || keyLower.includes('acccardno') || keyLower.includes('accountno')) && typeof val === 'string') {
      masked[key] = maskAccountNumber(val);
    } else if ((keyLower.includes('mobile') || keyLower.includes('tel') || keyLower.includes('phone')) && typeof val === 'string') {
      masked[key] = isProduction ? maskMobile(val) : val;
    } else if (keyLower.includes('email') && typeof val === 'string') {
      masked[key] = isProduction ? maskEmail(val) : val;
    } else if (val && typeof val === 'object') {
      masked[key] = maskSensitiveData(val);
    } else {
      masked[key] = val;
    }
  }

  return masked;
}

module.exports = { maskAccountNumber, maskMobile, maskEmail, maskSensitiveData };
