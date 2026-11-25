const config = require('../config/env');

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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal token error: ${data.error_description || data.error || res.status}`);
  }
  return data.access_token;
}

async function createOrder(amount, currency, orderId) {
  const token = await getAccessToken();
  const res = await fetch(`${config.paypal.apiBase}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency || 'USD',
            value: Number(amount).toFixed(2),
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

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal create order error: ${data.message || res.status}`);
  }
  return data;
}

async function captureOrder(providerOrderId) {
  const token = await getAccessToken();
  const res = await fetch(
    `${config.paypal.apiBase}/v2/checkout/orders/${providerOrderId}/capture`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`PayPal capture error: ${data.message || res.status}`);
  }
  return data;
}

module.exports = { getAccessToken, createOrder, captureOrder };