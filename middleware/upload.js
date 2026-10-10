// backend/middleware/upload.js  (REMPLACE ta version actuelle)
// Le fichier est garde en memoire le temps de la requete, puis envoye au
// stockage S3 (Cloudflare R2 ou Backblaze B2) par uploadController.
// Rien n'est ecrit sur le disque de Render ni dans MongoDB.
const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 Mo par fichier

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

module.exports = multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
});