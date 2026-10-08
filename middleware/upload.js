// backend/middleware/upload.js  (REMPLACE ta version actuelle)
// Les fichiers sont gardes en memoire le temps de la requete puis ecrits
// dans MongoDB (GridFS) par uploadController : ils survivent ainsi aux
// redemarrages et redeploiements de Render (disque ephemere).
const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 Mo par fichier

// Tous les types sont acceptes SAUF ceux qui peuvent executer du code quand
// ils sont ouverts depuis ton serveur (risque XSS / malware).
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