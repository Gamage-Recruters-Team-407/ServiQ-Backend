require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const { USER_ROLES, USER_STATUSES } = require('./constants/enums');

async function createAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME = 'Platform', ADMIN_LAST_NAME = 'Administrator' } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters) in the backend .env file.');
  }
  await connectDB();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await User.findOne({ email }).select('+password');
  if (existing) {
    existing.password = password;
    existing.user_role = USER_ROLES.ADMIN;
    existing.account_status = USER_STATUSES.ACTIVE;
    await existing.save();
    console.log(`Administrator account updated: ${email}`);
  } else {
    await User.create({ first_name: ADMIN_FIRST_NAME, last_name: ADMIN_LAST_NAME, email, password, user_role: USER_ROLES.ADMIN, account_status: USER_STATUSES.ACTIVE });
    console.log(`Administrator account created: ${email}`);
  }
}

createAdmin().catch((error) => { console.error('Admin provisioning failed:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect().catch(() => {}); });
