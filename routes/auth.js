const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Register form
router.get('/register', (req, res) => {
  res.render('pages/register');
});

// Register user
router.post('/register', async (req, res) => {
  const { name, email, password, city, role } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.send('Email already registered');

    const user = new User({ name, email, password, city, role });
    await user.save();
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Error registering user');
  }
});

// Login form
router.get('/login', (req, res) => {
  res.render('pages/login');
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    
    if (!user.isApproved) {
      return res.send('Account pending admin approval.');
    }

    if (!user || !(await user.matchPassword(password))) {
      return res.send('Invalid credentials');
    }
    req.session.user = user;
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Error logging in');
  }
});

// Logout
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});







module.exports = router;
