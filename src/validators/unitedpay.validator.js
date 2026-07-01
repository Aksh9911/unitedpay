'use strict';

const Joi = require('joi');

const payinCreateSchema = Joi.object({
  price: Joi.number().positive().required().messages({
    'number.base': 'price must be a number',
    'number.positive': 'price must be positive',
    'any.required': 'price is required',
  }),
  userId: Joi.number().integer().positive().required().messages({
    'number.base': 'userId must be a number',
    'any.required': 'userId is required',
  }),
  tradeNo: Joi.string().optional(),
  notifyUrl: Joi.string().uri().optional().messages({
    'string.uri': 'notifyUrl must be a valid URL',
  }),
  callbackUrl: Joi.string().uri().optional().messages({
    'string.uri': 'callbackUrl must be a valid URL',
  }),
  payType: Joi.string().default('01'),
  payerName: Joi.string().required().messages({
    'any.required': 'payerName is required',
  }),
  payMobile: Joi.string().required().messages({
    'any.required': 'payMobile is required',
  }),
  payEmail: Joi.string().email().required().messages({
    'string.email': 'payEmail must be a valid email',
    'any.required': 'payEmail is required',
  }),
});

const payinQuerySchema = Joi.object({
  tradeNo: Joi.string().required().messages({
    'any.required': 'tradeNo is required',
  }),
});

const payoutCreateSchema = Joi.object({
  price: Joi.number().positive().required().messages({
    'number.base': 'price must be a number',
    'number.positive': 'price must be positive',
    'any.required': 'price is required',
  }),
  withdrawId: Joi.string().required().messages({
    'string.base': 'withdrawId must be a string',
    'any.required': 'withdrawId is required',
  }),
  tradeNo: Joi.string().optional(),
  notifyUrl: Joi.string().uri().optional().messages({
    'string.uri': 'notifyUrl must be a valid URL',
  }),
  mode: Joi.string().default('S1'),
  accBankCode: Joi.string().required().messages({
    'any.required': 'accBankCode is required',
  }),
  accCardNo: Joi.string().required().messages({
    'any.required': 'accCardNo is required',
  }),
  accName: Joi.string().required().messages({
    'any.required': 'accName is required',
  }),
  accTel: Joi.string().required().messages({
    'any.required': 'accTel is required',
  }),
  accEmail: Joi.string().email().optional().allow('').messages({
    'string.email': 'accEmail must be a valid email',
  }),
  purpose: Joi.string().required().messages({
    'any.required': 'purpose is required',
  }),
});

const payoutQuerySchema = Joi.object({
  tradeNo: Joi.string().required().messages({
    'any.required': 'tradeNo is required',
  }),
});

const balanceQuerySchema = Joi.object({});

const payinWebhookSchema = Joi.object({
  tradeNo: Joi.string().required(),
  status: Joi.string().required(),
  mchNo: Joi.string().optional(),
  price: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  orderDate: Joi.string().optional(),
  payType: Joi.string().optional(),
}).unknown(true);

const payoutWebhookSchema = Joi.object({
  tradeNo: Joi.string().required(),
  status: Joi.string().required(),
  mchNo: Joi.string().optional(),
  price: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  orderDate: Joi.string().optional(),
  mode: Joi.string().optional(),
}).unknown(true);

function validate(schema, data) {
  const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    const err = new Error('Validation failed');
    err.code = 'VALIDATION_ERROR';
    err.details = details;
    throw err;
  }
  return value;
}

module.exports = {
  validatePayinCreate: (data) => validate(payinCreateSchema, data),
  validatePayinQuery: (data) => validate(payinQuerySchema, data),
  validatePayoutCreate: (data) => validate(payoutCreateSchema, data),
  validatePayoutQuery: (data) => validate(payoutQuerySchema, data),
  validateBalanceQuery: (data) => validate(balanceQuerySchema, data),
  validatePayinWebhook: (data) => validate(payinWebhookSchema, data),
  validatePayoutWebhook: (data) => validate(payoutWebhookSchema, data),
};
