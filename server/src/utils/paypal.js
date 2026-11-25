const crypto = require('node:crypto');
const config = require('../config/env');

class PayPalApiError extends Error {
  constructor(message, status, code, data) {
    super(message);
    this.name = 'PayPalApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

function deterministicRequestId(scope, identifier) {
  return crypto
    .createHash('sha256')
    .update(`libroya:paypal:${scope}:${identifier}`)
    .digest('hex')
    .slice(0, 32);
}

async function readResponse(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 200) };
  }
}

function providerErrorCode(data) {
  if (typeof data.code === 'string') return data.code;
  if (typeof data.error === 'string') return data.error;
  if (typeof data.name === 'string' && data.name !== 'UNPROCESSABLE_ENTITY') return data.name;
  const issue = Array.isArray(data.details)
    ? data.details.find((detail) => typeof detail.issue === 'string')?.issue
    : null;
  return issue || null;
}

async function getAccessToken() {
  const credentials = Buffer.from(
    `${config.paypal.clientId}:${config.paypal.clientSecret}`
  ).toString('base64');

  const res = await fetch(`${config.paypal.apiBase}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await readResponse(res);
  if (!res.ok) {
    throw new PayPalApiError(
      `PayPal token error: ${data.error_description || data.error || res.status}`,
      res.status,
      providerErrorCode(data),
      data
    );
  }
  return data.access_token;
}

async function createOrder(amount, currency, orderId, requestId) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Invalid PayPal order amount');
  const token = await getAccessToken();
  const paypalRequestId = requestId || deterministicRequestId('create', orderId);
  const res = await fetch(`${config.paypal.apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': paypalRequestId,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency || 'USD',
            value: value.toFixed(2),
          },
          custom_id: String(orderId),
        },
      ],
      application_context: {
        brand_name: 'LibroYa',
        user_action: 'PAY_NOW',
      },
    }),
  });

  const data = await readResponse(res);
  if (!res.ok) {
    throw new PayPalApiError(
      `PayPal create order error: ${data.message || res.status}`,
      res.status,
      providerErrorCode(data),
      data
    );
  }
  return data;
}

async function captureOrder(providerOrderId, requestId) {
  const token = await getAccessToken();
  const paypalRequestId = requestId || deterministicRequestId('capture', providerOrderId);
  const res = await fetch(
    `${config.paypal.apiBase}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': paypalRequestId,
      },
    }
  );

  const data = await readResponse(res);
  if (!res.ok) {
    throw new PayPalApiError(
      `PayPal capture error: ${data.message || res.status}`,
      res.status,
      providerErrorCode(data),
      data
    );
  }
  return data;
}

async function getOrderDetails(providerOrderId) {
  const token = await getAccessToken();
  const res = await fetch(
    `${config.paypal.apiBase}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const data = await readResponse(res);
  if (!res.ok) {
    throw new PayPalApiError(
      `PayPal order details error: ${data.message || res.status}`,
      res.status,
      providerErrorCode(data),
      data
    );
  }
  return data;
}

module.exports = {
  PayPalApiError,
  deterministicRequestId,
  getAccessToken,
  createOrder,
  captureOrder,
  getOrderDetails,
};
