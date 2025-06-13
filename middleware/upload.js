const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname);
  if (ext === '.jpg' || ext === '.png' || ext === '.jpeg') {
    cb(null, true);
  } else {
    cb(new Error('Only images allowed'), false);
  }
};

module.exports = multer({ storage, fileFilter });
