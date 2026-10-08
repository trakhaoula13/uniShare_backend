// backend/controllers/uploadController.js  (REMPLACE ta version actuelle)
const crypto = require("crypto");
const path = require("path");
const mongoose = require("mongoose");

const getBucket = () =>
    new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });

// Types servis directement dans le navigateur ; les autres sont telecharges.
const CONTENT_TYPES = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
    ".txt": "text/plain; charset=utf-8",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip",
};
const INLINE_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".txt", ".mp4", ".webm", ".mp3", ".wav"]);

// @route POST /api/uploads
// Recoit un fichier (champ "file"), l'ecrit dans MongoDB (GridFS) et renvoie
// son URL publique + ses metadonnees. Un appel par fichier.
exports.uploadFile = async(req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier recu" });
    }

    try {
        const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
        const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

        // multer lit le nom en latin1 : on le reconvertit en UTF-8 pour garder
        // correctement les accents et l'arabe dans les noms de fichiers.
        const fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");

        await new Promise((resolve, reject) => {
            const stream = getBucket().openUploadStream(storedName, {
                metadata: { originalName: fileName, contentType: req.file.mimetype, uploadedBy: req.user._id },
            });
            stream.on("error", reject);
            stream.on("finish", resolve);
            stream.end(req.file.buffer);
        });

        // Derriere le proxy de Render, req.protocol vaut "http" : on lit
        // x-forwarded-proto pour obtenir "https". PUBLIC_BACKEND_URL (optionnel)
        // impose l'adresse publique, ex: https://unishare-backend-83eh.onrender.com
        const proto = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
        const baseUrl = (process.env.PUBLIC_BACKEND_URL || `${proto}://${req.get("host")}`).replace(/\/$/, "");

        res.status(201).json({
            fileUrl: `${baseUrl}/api/uploads/files/${storedName}`,
            fileName,
            fileType: req.file.mimetype,
            size: req.file.size,
        });
    } catch (error) {
        res.status(500).json({ message: "Echec de l'enregistrement du fichier" });
    }
};

// @route GET /api/uploads/files/:filename
exports.serveFile = async(req, res) => {
    try {
        const filename = path.basename(req.params.filename);
        const bucket = getBucket();
        const found = await bucket.find({ filename }).limit(1).toArray();
        if (found.length === 0) {
            return res.status(404).json({ message: "Fichier introuvable" });
        }

        const file = found[0];
        const ext = path.extname(filename).toLowerCase();
        const originalName = (file.metadata && file.metadata.originalName) || filename;

        res.set({
            "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
            "Content-Length": file.length,
            "Content-Disposition": `${INLINE_EXTENSIONS.has(ext) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(originalName)}`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=31536000, immutable",
            // Le site (Netlify) et l'API (Render) sont sur des domaines differents :
            // sans cet en-tete, les miniatures d'images seraient bloquees.
            "Cross-Origin-Resource-Policy": "cross-origin",
        });

        bucket
            .openDownloadStreamByName(filename)
            .on("error", () => res.end())
            .pipe(res);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la lecture du fichier" });
    }
};