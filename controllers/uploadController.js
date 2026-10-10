// backend/controllers/uploadController.js  (REMPLACE ta version actuelle)
// Stockage des fichiers sur un bucket S3 compatible : Cloudflare R2 ou
// Backblaze B2 (10 Go gratuits). Le bucket reste PRIVE : les fichiers sont
// lus par le backend, qui les renvoie au navigateur.
//
// Variables d'environnement a definir sur Render :
//   S3_ENDPOINT           ex R2 : https://<ACCOUNT_ID>.r2.cloudflarestorage.com
//                         ex B2 : https://s3.us-west-004.backblazeb2.com
//   S3_REGION             R2 : auto      B2 : us-west-004 (selon ton bucket)
//   S3_BUCKET             nom du bucket
//   S3_ACCESS_KEY_ID
//   S3_SECRET_ACCESS_KEY
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

// Retire espaces, retours a la ligne et guillemets colles par erreur.
const clean = (value) => (value || "").trim().replace(/^["']|["']$/g, "");

const s3 = new S3Client({
    region: clean(process.env.S3_REGION) || "auto",
    endpoint: clean(process.env.S3_ENDPOINT),
    credentials: {
        accessKeyId: clean(process.env.S3_ACCESS_KEY_ID),
        secretAccessKey: clean(process.env.S3_SECRET_ACCESS_KEY),
    },
    forcePathStyle: true,
    // R2 et B2 n'acceptent pas les sommes de controle automatiques recentes du SDK.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
});

const isConfigured = () =>
    process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY;

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

const keyFor = (filename) => `unishare/${filename}`;

// @route POST /api/uploads
// Recoit un fichier (champ "file"), l'envoie au bucket et renvoie son URL
// (servie par ce backend) + ses metadonnees. Un appel par fichier.
exports.uploadFile = async(req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier recu" });
    }
    // Supprime le fichier temporaire, quoi qu'il arrive.
    const cleanup = () => fs.unlink(req.file.path, () => {});

    if (!isConfigured()) {
        cleanup();
        return res.status(500).json({ message: "Stockage non configure : variables S3_* manquantes sur le serveur" });
    }

    try {
        const ext = path.extname(req.file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "");
        const storedName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

        // multer lit le nom en latin1 : on le reconvertit en UTF-8 pour garder
        // correctement les accents et l'arabe dans les noms de fichiers.
        const fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");

        await s3.send(
            new PutObjectCommand({
                Bucket: process.env.S3_BUCKET,
                Key: keyFor(storedName),
                // Le fichier est envoye en un seul bloc (signature standard) : le mode
                // "flux" provoque l'erreur "request body was too small" chez Backblaze.
                // Taille max 50 Mo : tient sans probleme en memoire le temps de l'envoi.
                Body: fs.readFileSync(req.file.path),
                ContentType: CONTENT_TYPES[ext] || "application/octet-stream",
                // Les metadonnees S3 doivent etre en ASCII : on encode le nom.
                Metadata: { originalname: encodeURIComponent(fileName) },
            })
        );

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
        // Details dans les logs de Render (jamais les cles) pour faciliter le diagnostic.
        console.error("[stockage] envoi echoue :", {
            name: error.name,
            code: error.Code || error.code,
            status: error.$metadata && error.$metadata.httpStatusCode,
            message: error.message,
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION,
            bucket: process.env.S3_BUCKET,
            keyIdLength: (process.env.S3_ACCESS_KEY_ID || "").length,
            secretLength: (process.env.S3_SECRET_ACCESS_KEY || "").length,
        });
        res.status(500).json({ message: `Echec de l'envoi vers le stockage : ${error.message || "erreur inconnue"}` });
    } finally {
        cleanup();
    }
};

// @route GET /api/uploads/files/:filename
exports.serveFile = async(req, res) => {
    if (!isConfigured()) {
        return res.status(500).json({ message: "Stockage non configure" });
    }

    try {
        const filename = path.basename(req.params.filename);
        const ext = path.extname(filename).toLowerCase();

        const object = await s3.send(
            new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: keyFor(filename) })
        );

        let originalName = filename;
        try {
            if (object.Metadata && object.Metadata.originalname) {
                originalName = decodeURIComponent(object.Metadata.originalname);
            }
        } catch {
            /* nom invalide : on garde le nom technique */
        }

        const headers = {
            "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
            "Content-Disposition": `${INLINE_EXTENSIONS.has(ext) ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(originalName)}`,
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=31536000, immutable",
            // Le site (Netlify) et l'API (Render) sont sur des domaines differents :
            // sans cet en-tete, les miniatures d'images seraient bloquees.
            "Cross-Origin-Resource-Policy": "cross-origin",
        };
        if (object.ContentLength) headers["Content-Length"] = object.ContentLength;
        res.set(headers);

        object.Body.on("error", () => res.end()).pipe(res);
    } catch (error) {
        if (error.name === "NoSuchKey" || (error.$metadata && error.$metadata.httpStatusCode === 404)) {
            return res.status(404).json({ message: "Fichier introuvable" });
        }
        res.status(500).json({ message: "Erreur lors de la lecture du fichier" });
    }
};