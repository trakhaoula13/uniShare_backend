const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");
const { uploadFile } = require("../controllers/uploadController");

router.post("/", protect, upload.single("file"), uploadFile);

// Gestion propre des erreurs multer (fichier trop lourd, type invalide...)
router.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message });
  next();
});

module.exports = router;
