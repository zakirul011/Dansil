require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static('uploads'));

app.set('view engine', 'ejs');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Session Setup
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));


app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});


// notification
const Notification = require('./models/Notification');

app.use(async (req, res, next) => {
  if (req.session.user) {
    const notifications = await Notification.find({
      user: req.session.user._id,
      read: false
    }).sort({ createdAt: -1 });

    res.locals.user = req.session.user;
    res.locals.notifications = notifications;
  } else {
    res.locals.user = null;
    res.locals.notifications = [];
  }

  next();
});


// Routes
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);


const itemRoutes = require('./routes/item');
app.use('/', itemRoutes);


// Home route
app.get('/', (req, res) => {
  res.render('pages/home', { user: req.session.user });
});


// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
