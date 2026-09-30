const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
require('dotenv').config();

const router = express.Router();

function makeToken(business) {
  return jwt.sign(
    { businessId: business.id, businessName: business.businessName, email: business.email },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '12h' }
  );
}

// POST /api/auth/signup - register a new business
router.post('/signup', (req, res) => {
  const { businessName, email, password, mobile } = req.body;

  if (!businessName || !email || !password || !mobile) {
    return res.status(400).json({ message: 'Business name, email, password, and mobile are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.get('businesses').find({ email: normalizedEmail }).value();
  if (existing) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const newBusiness = {
    id: uuidv4(),
    businessName: businessName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    mobile: mobile.trim(),
    createdAt: new Date().toISOString()
  };

  db.get('businesses').push(newBusiness).write();

  const token = makeToken(newBusiness);
  res.status(201).json({ token, businessName: newBusiness.businessName, email: newBusiness.email });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const business = db.get('businesses').find({ email: normalizedEmail }).value();

  if (!business) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const isMatch = bcrypt.compareSync(password, business.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = makeToken(business);
  res.json({ token, businessName: business.businessName, email: business.email });
});

module.exports = router;
