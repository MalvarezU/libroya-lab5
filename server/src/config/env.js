// Validacion de variables de entorno requeridas.
const required = [
  'MONGODB_URI',
  'JWT_SECRET',
  'PAYPAL_CLIENT_ID',
  'PAYPAL_CLIENT_SECRET',
  'PAYPAL_API_BASE',
  'CLIENT_ORIGIN',
];

for (const key of required) {
  if (!process.env[key] || String(process.env[key]).trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN,
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    apiBase: process.env.PAYPAL_API_BASE.replace(/\/$/, ''),
  },
  seed: process.env.SEED === 'true',
};

module.exports = config;