// backend/middleware/upload.js  (REMPLACE ta version actuelle)
// Le fichier est ecrit dans un fichier TEMPORAIRE (dossier temp du systeme)
// pendant l'envoi, puis transmis au stockage S3 (Backblaze B2 / Cloudflare R2)
// par uploadController, qui supprime ensuite le fichier temporaire.
// Cela evite de charger tout le fichier en memoire (serveur gratuit limite).
const multer = require("multer");
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo par fichier

// Tous les types sont acceptes SAUF ceux qui peuvent executer du code quand
// ils sont ouverts (risque XSS / malware).
const BLOCKED_EXTENSIONS = new Set([
    ".html", ".htm", ".xhtml", ".svg", ".js", ".mjs", ".php",
    ".exe", ".msi", ".bat", ".cmd", ".sh", ".jar", ".com", ".scr", ".vbs",
]);

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.has(ext)) {
        return cb(new Error(`Type de fichier non autorise (${ext || "inconnu"}).`));
    }
    cb(null, true);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, os.tmpdir()),
    filename: (req, file, cb) => cb(null, `upload-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`),
});

module.exports = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});