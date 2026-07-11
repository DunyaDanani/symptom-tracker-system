// Shared multer helpers for any route that accepts a file upload later
// served back out under /uploads (study modules, message attachments).
// Doctor documents validate PDF/image after the fact in their own
// controller; this does the equivalent check up front, via multer's
// fileFilter, so anything outside the allowlist is rejected before it's
// ever written to disk — an uploaded .html/.svg/.js can't sit in
// /uploads waiting to be served with script-execution rights in
// someone's browser.
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

export const documentFileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Unsupported file type. Allowed: PDF, images, Word, PowerPoint, Excel, or plain text."
      )
    );
  }
};

// Multer's own middleware uses a callback signature, so a rejected file
// (or a size-limit breach) becomes an error passed to Express's default
// HTML error handler rather than this API's usual JSON error shape.
// Wrapping it lets every upload route return a normal
// { success: false, message } response like everything else here.
export const runUpload = (multerMiddleware) => (req, res, next) => {
  multerMiddleware(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }
    next();
  });
};
