const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

// Stockage sur disque (backend/uploads) plutot qu'en base64 dans MongoDB :
// documents plus legers, requetes plus rapides, pas de limite artificielle
// sur la taille des fichiers geree par la base de donnees.
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "..", "uploads")),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Seuls les fichiers PDF sont acceptes"));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 Mo
});

module.exports = upload;
