const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  category: String,
  location: String,
  image: String,
  status: { type: String, default: 'available' }, // available, requested, accepted
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  donor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isApproved: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Item', itemSchema);
