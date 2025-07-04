const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification')

// Register form
router.get('/register',  (req, res) => { 
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
    
    // Notify admin
    const message = `${user.name} is registered and waiting for approval.`;
    const admin = await User.findOne({role:"admin"})
    
    await Notification.create({
      user: admin._id,
      message
    });

    res.redirect('/login');
      
    
  } catch (err) {
    console.log(err);
    
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
      res.render("pages/pending")
      // return res.send('Account pending admin approval.');
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


router.get('/profile/edit', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  res.render('pages/edit-profile', { user: req.session.user });
});

router.post('/profile/edit', async (req, res) => {
  const { name, city } = req.body;
  const userId = req.session.user._id;

  try {
    const updatedUser = await User.findByIdAndUpdate(userId, {
      name,
      city
    }, { new: true });

    // Update session
    req.session.user = updatedUser;
    res.redirect('/');
  } catch (err) {
    res.status(500).send('Profile update failed.');
  }
});





module.exports = router;
