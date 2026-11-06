const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Customer = require('../models/Customer');
const Provider = require('../models/Provider');
const { USER_ROLES, USER_STATUSES } = require('../constants/enums');

const publicUser = (user) => ({
  id: user._id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  phone_number: user.phone_number || null,
  role: user.user_role,
  user_role: user.user_role,
  profile_image: user.profile_image || null,
  account_status: user.account_status,
});

const issueToken = (user) => jwt.sign(
  { sub: user._id.toString(), role: user.user_role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
);

exports.register = async (req, res) => {
  try {
    const { first_name, last_name, email, password, phone_number, role } = req.body;
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ success: false, message: 'First name, last name, email and password are required.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ success: false, message: 'Password must contain at least 8 characters.' });
    }
    const allowedRole = role === USER_ROLES.PROVIDER ? USER_ROLES.PROVIDER : USER_ROLES.CUSTOMER;
    const normalizedEmail = String(email).trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      first_name: String(first_name).trim(),
      last_name: String(last_name).trim(),
      email: normalizedEmail,
      phone_number,
      password: passwordHash,
      user_role: allowedRole,
      account_status: USER_STATUSES.ACTIVE,
    });
    if (allowedRole === USER_ROLES.PROVIDER) await Provider.create({ user_id: user._id });
    else await Customer.create({ user_id: user._id });
    const token = issueToken(user);
    return res.status(201).json({ success: true, message: 'Account created successfully.', token, user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'Email is already registered.' });
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Unable to create account.' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });
    const user = await User.findOne({ email: String(email).trim().toLowerCase() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    if (expectedRole && user.user_role !== expectedRole) {
      return res.status(403).json({ success: false, message: `This account is not registered as ${expectedRole}. Please use the correct sign-in page.` });
    }
    if (user.account_status !== USER_STATUSES.ACTIVE) {
      return res.status(403).json({ success: false, message: `Your account is ${user.account_status.toLowerCase()}. Please contact support.` });
    }
    user.last_login_at = new Date();
    await user.save();
    return res.json({ success: true, message: 'Signed in successfully.', token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
};

exports.me = async (req, res) => res.json({ success: true, user: publicUser(req.user) });
