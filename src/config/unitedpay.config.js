'use strict';

function getConfig() {
  const baseUrl = process.env.UNITEDPAY_BASE_URL;
  const mchNo = process.env.UNITEDPAY_MCH_NO;
  const signKey = process.env.UNITEDPAY_SIGN_KEY;
  const encKey = process.env.UNITEDPAY_ENC_KEY;
  const callbackUrl = process.env.UNITEDPAY_CALLBACK_URL;
  const notifyUrl = process.env.UNITEDPAY_NOTIFY_URL;
  const payoutNotifyUrl = process.env.UNITEDPAY_PAYOUT_NOTIFY_URL;

  if (!baseUrl) throw new Error('UNITEDPAY_BASE_URL is not set');
  if (!mchNo) throw new Error('UNITEDPAY_MCH_NO is not set');
  if (!signKey) throw new Error('UNITEDPAY_SIGN_KEY is not set');
  if (!encKey) throw new Error('UNITEDPAY_ENC_KEY is not set');
  if (!callbackUrl) throw new Error('UNITEDPAY_CALLBACK_URL is not set');
  if (!notifyUrl) throw new Error('UNITEDPAY_NOTIFY_URL is not set');
  if (!payoutNotifyUrl) throw new Error('UNITEDPAY_PAYOUT_NOTIFY_URL is not set');

  return {
    baseUrl,
    mchNo,
    signKey,
    encKey,
    callbackUrl,
    notifyUrl,
    payoutNotifyUrl,
    endpoints: {
      payinCreate: '/ws/trans/nocard/makeOrder',
      payinQuery: '/ws/trans/nocard/orderQuery',
      payoutCreate: '/ws/trans/nocard/transferApply',
      payoutQuery: '/ws/trans/nocard/transferQuery',
      balanceQuery: '/ws/trans/nocard/accBalQuery',
    },
    timeoutMs: 30000,
  };
}

module.exports = { getConfig };
