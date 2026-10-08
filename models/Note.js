const mongoose = require("mongoose");

// Un fichier joint a une note (PDF, Word, image, archive...).
const attachmentSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileType: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    size: { type: Number, default: 0 },
}, { _id: false });

// Une note texte ajoutee a l'interieur de la page (sous-note).
const entrySchema = new mongoose.Schema({
    title: { type: String, default: "", trim: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const noteSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    // Ancien format (1 seul PDF) : conserve pour ne pas casser les notes existantes.
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    // Plusieurs fichiers de tout type.
    files: { type: [attachmentSchema], default: [] },
    // Plusieurs notes texte dans la meme page.
    entries: { type: [entrySchema], default: [] },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true },
    sharedWithViewers: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Note", noteSchema);