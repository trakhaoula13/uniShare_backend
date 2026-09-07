// @route POST /api/uploads
// Recoit un seul fichier PDF (champ "file"), le stocke sur disque, et
// renvoie son URL absolue + son nom d'origine.
exports.uploadFile = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier recu" });
  }

  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  res.status(201).json({
    fileUrl,
    fileName: req.file.originalname,
    fileType: req.file.mimetype,
  });
};
