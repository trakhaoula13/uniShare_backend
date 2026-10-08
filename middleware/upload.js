// backend/middleware/upload.js  (REMPLACE ta version actuelle)
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 Mo par fichier

// Tous les types sont acceptes SAUF ceux qui peuvent executer du code quand
// ils sont ouverts depuis ton serveur (risque XSS / malware).
const BLOCKED_EXTENSIONS = new Set([
    ".html", ".htm", ".xhtml", ".svg", ".js", ".mjs", ".php",
    ".exe", ".msi", ".bat", ".cmd", ".sh", ".jar", ".com", ".scr", ".vbs",
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
});

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
        return cb(new Error(`Type de fichier non autorise (${ext || "inconnu"}).`));
    }
    cb(null, true);
};

module.exports = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });