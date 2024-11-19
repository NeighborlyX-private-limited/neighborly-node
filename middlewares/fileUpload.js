const multer = require("multer");

const upload = multer({ storage: multer.memoryStorage() });
//activityLogger.info("File upload middleware loaded");
module.exports = {
  singleFileUpload: upload.single("file"),
  multipleFilesUpload: upload.fields([
    { name: "files", maxCount: 10 },
    { name: "thumbnail", maxCount: 1 },
  ]),
};
