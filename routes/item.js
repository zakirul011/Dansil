const express = require('express');
const router = express.Router();
const Item = require('../models/Item');
const User = require('../models/User'); 
const upload = require('../middleware/upload');
const requireLogin = require('../middleware/auth');
const adminOnly = require('../middleware/admin');



// Show form
router.get('/donate', requireLogin, (req, res) => {
  res.render('pages/donate');
});


// Handle submission
router.post('/donate', requireLogin, upload.single('image'), async (req, res) => {

  const { title, description, category, location } = req.body;
  try {
    const newItem = new Item({
      title,
      description,
      category,
      location,
      donor: req.session.user._id,
      image: req.file ? req.file.filename : ''
    });
    

    await newItem.save();
    res.redirect('/my-donations');
  } catch (err) {
    res.status(500).send('Error posting item');
  }
});

// Show my donations
router.get('/my-donations', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'donor' && req.session.user.role !== 'admin') return res.send('Access denied.');

  const items = await Item.find({ donor: req.session.user._id })
    .populate('requestedBy');

  res.render('pages/my-donations', { items });
});



// Browse all available items
router.get('/browse', async (req, res) => {
  const { category, keyword, location } = req.query;
  const filter = { status: 'available', isApproved: true };

  if (category) filter.category = category;
  if (location) filter.location = { $regex: location, $options: 'i' };
  if (keyword) {
    filter.$or = [
      { title: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }

  const items = await Item.find(filter).populate('donor');
  res.render('pages/browse', { items });
});



// Request item
const Notification = require('../models/Notification');

router.post('/request/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item || req.session.user.role !== 'recipient') {
    return res.send('Invalid request');
  }

  item.status = 'requested';
  item.requestedBy = req.session.user._id;
  await item.save();

  // Notify donor
  const message = `${req.session.user.name} has requested your item "${item.title}".`;
  await Notification.create({
    user: item.donor,
    message
  });

  res.redirect('/browse');
});


// Show recipient's requested items
router.get('/my-requests', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'recipient') {
    return res.send('Only recipients can view this page.');
  }

  const items = await Item.find({ requestedBy: req.session.user._id }).populate('donor');
  res.render('pages/my-requests', { items });
});

// Donor: view received requests
router.get('/received-requests', requireLogin, async (req, res) => {
  if (req.session.user.role !== 'donor' && req.session.user.role !== 'admin') {
    return res.send('Only donors can view this page.');
  }

  const items = await Item.find({ donor: req.session.user._id, status: 'requested' })
    .populate('requestedBy');
    
  res.render('pages/received-requests', { items });
});

// Accept request
router.post('/accept/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (item.donor.toString() !== req.session.user._id.toString()) {
    return res.send('Unauthorized');
  }

  item.status = 'accepted';
  await item.save();

  // Notify recipient
  if (item.requestedBy) {
    await Notification.create({
      user: item.requestedBy,
      message: `Your request for "${item.title}" has been accepted!`
    });
  }

  res.redirect('/received-requests');
});


// Reject request
router.post('/reject/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (item.donor.toString() !== req.session.user._id.toString()) {
    return res.send('Unauthorized');
  }

  item.status = 'available';
  item.requestedBy = null;
  await item.save();
  res.redirect('/received-requests');
});




// Admin dashboard
router.get('/admin/dashboard', adminOnly, async (req, res) => {
  const users = await User.find({}); // Show all users
  const items = await Item.find({}); // Show all items

  const flaggedItems = await Item.find({ flagCount: { $gt: 0 } }).populate('donor');

  res.render('pages/admin-dashboard', { users, items, flaggedItems, user: null });

});



// Approve user
router.post('/admin/user/approve/:id', adminOnly, async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { isApproved: true });
  res.redirect('/admin/dashboard');
});

// Reject (delete) user
router.post('/admin/user/reject/:id', adminOnly, async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});

// Approve item
router.post('/admin/item/approve/:id', adminOnly, async (req, res) => {
  await Item.findByIdAndUpdate(req.params.id, { isApproved: true });
  res.redirect('/admin/dashboard');
});

// Reject (delete) item
router.post('/admin/item/reject/:id', adminOnly, async (req, res) => {
  await Item.findByIdAndDelete(req.params.id);
  res.redirect('/admin/dashboard');
});


// donation edit delete

router.get('/donate/edit/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.donor.toString() !== req.session.user._id.toString()) {
    return res.send('Unauthorized or item not found');
  }
  res.render('pages/edit-donation', { item });
});


router.post('/donate/edit/:id', requireLogin, upload.single('image'), async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.donor.toString() !== req.session.user._id.toString()) {
    return res.send('Unauthorized');
  }

  const { title, description, category, location } = req.body;
  item.title = title;
  item.description = description;
  item.category = category;
  item.location = location;
  if (req.file) {
    item.image = req.file.filename;
  }

  await item.save();
  res.redirect('/my-donations');
});


router.post('/donate/delete/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);
  if (!item || item.donor.toString() !== req.session.user._id.toString()) {
    return res.send('Unauthorized');
  }

  await Item.findByIdAndDelete(req.params.id);
  res.redirect('/my-donations');
});


// report as flag
router.post('/flag/:id', requireLogin, async (req, res) => {
  const item = await Item.findById(req.params.id);

  if (!item) return res.send('Item not found');

  // prevent double flagging
  const alreadyFlagged = item.flaggedBy.includes(req.session.user._id);
  if (alreadyFlagged) return res.send('You already flagged this item.');

  item.flagCount += 1;
  item.flaggedBy.push(req.session.user._id);
  await item.save();

  res.redirect('/browse');
});

// get notification to notification page
router.get('/notifications', requireLogin, async (req, res) => {
  const notes = await Notification.find({ user: req.session.user._id }).sort({ createdAt: -1 });
  res.render('pages/notifications', { notes });
});

router.post('/notifications/mark-read/:id', requireLogin, async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { read: true });
  res.redirect('/notifications');
});




module.exports = router;
