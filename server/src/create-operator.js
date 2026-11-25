require('dotenv').config();

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('./models/User');
const { connectDB } = require('./db');

async function main() {
  const email = process.env.OPERATOR_EMAIL;
  const password = process.env.OPERATOR_PASSWORD;
  const name = process.env.OPERATOR_NAME || 'Operador';

  if (!email || !password) {
    throw new Error('Define OPERATOR_EMAIL y OPERATOR_PASSWORD antes de ejecutar seed:operator');
  }
  if (password.length < 8) {
    throw new Error('OPERATOR_PASSWORD debe tener al menos 8 caracteres');
  }

  await connectDB();
  const passwordHash = await bcrypt.hash(password, 10);
  await User.updateOne(
    { email: email.toLowerCase() },
    { $set: { name, email: email.toLowerCase(), passwordHash, role: 'operador' } },
    { upsert: true }
  );
  console.log(`Operador listo: ${email}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});