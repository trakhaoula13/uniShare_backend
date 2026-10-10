// backend/routes/uploadRoutes.js  (REMPLACE ta version actuelle)
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");
const { uploadFile, serveFile } = require("../controllers/uploadController");

// Lecture d'un fichier (les liens s'ouvrent dans un nouvel onglet, sans
// en-tete Authorization). Les noms sont aleatoires et non devinables.
router.get("/files/:filename", serveFile);

router.post("/", protect, upload.single("file"), uploadFile);

// Gestion propre des erreurs multer (fichier trop lourd, type invalide...)
router.use((err, req, res, next) => {
    if (err) return res.status(400).json({ message: err.message });
    next();
});

module.exports = router;