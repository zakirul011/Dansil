require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const methodOverride = require('method-override');
const path = require('path');

const app = express();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method'));

app.set('view engine', 'ejs');

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log(err));

// Session Setup
app.use(session({
  secret: 'donation_secret_key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
}));


app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});


// Routes
const authRoutes = require('./routes/auth');
app.use('/', authRoutes);

// Home route
app.get('/', (req, res) => {
  console.log(req.session.user);
  
  res.render('pages/home', { user: req.session.user });
});

const itemRoutes = require('./routes/item');
app.use('/', itemRoutes);

// Make /uploads public
app.use('/uploads', express.static('uploads'));


// Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
