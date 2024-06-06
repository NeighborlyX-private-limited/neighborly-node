const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
//activityLogger.info("File upload middleware loaded");
module.exports = {
  singleFileUpload: upload.single("file"),
};
