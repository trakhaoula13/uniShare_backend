// @route POST /api/uploads
// Recoit un fichier (champ "file"), de n'importe quel type autorise, le
// stocke sur disque et renvoie son URL absolue + ses metadonnees.
// Pour envoyer plusieurs fichiers, le frontend fait un appel par fichier.
exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "Aucun fichier recu" });
    }

    // Derriere le proxy de Render, req.protocol vaut "http" : on lit l'en-tete
    // x-forwarded-proto pour obtenir "https". PUBLIC_BACKEND_URL (optionnel)
    // permet d'imposer l'adresse publique, ex: https://unishare-backend-83eh.onrender.com
    const proto = (req.get("x-forwarded-proto") || req.protocol).split(",")[0].trim();
    const baseUrl = (process.env.PUBLIC_BACKEND_URL || `${proto}://${req.get("host")}`).replace(/\/$/, "");
    const fileUrl = `${baseUrl}/uploads/${req.file.filename}`;

    // multer lit le nom en latin1 : on le reconvertit en UTF-8 pour garder
    // correctement les accents et l'arabe dans les noms de fichiers.
    const fileName = Buffer.from(req.file.originalname, "latin1").toString("utf8");

    res.status(201).json({
        fileUrl,
        fileName,
        fileType: req.file.mimetype,
        size: req.file.size,
    });
};