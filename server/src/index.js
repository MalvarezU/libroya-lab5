require('dotenv').config();

const config = require('./config/env');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { connectDB } = require('./db');
const { initSocket } = require('./socket');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientOrigin, credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.use(errorHandler);

const httpServer = http.createServer(app);
initSocket(app, httpServer);

async function main() {
  await connectDB();
  if (config.seed) {
    const { seed } = require('./seed');
    await seed();
  }
  httpServer.listen(config.port, '0.0.0.0', () => {
    console.log(`LibroYa server listening on port ${config.port}`);
  });
}

main().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});