const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { ApiError } = require('./errorHandler');

const TMP_DIR = path.join(env.uploads.dir, 'tmp');
fs.mkdirSync(TMP_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.csv', '.xlsx', '.xls', '.sqlite', '.db']);

const storage = multer.diskStorage({
  destination: TMP_DIR,
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: env.uploads.maxSizeMb * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new ApiError(400, `Unsupported file type "${ext}". Allowed: csv, xlsx, xls, sqlite, db.`));
    }
    cb(null, true);
  },
});

module.exports = upload;
