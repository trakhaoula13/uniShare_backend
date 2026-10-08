const mongoose = require("mongoose");

// Un fichier joint (PDF, Word, image, archive...).
const attachmentSchema = new mongoose.Schema({
    fileName: { type: String, required: true },
    fileType: { type: String, default: "" },
    fileUrl: { type: String, required: true },
    size: { type: Number, default: 0 },
}, { _id: false });

// Une note texte ajoutee a l'interieur de la page.
const entrySchema = new mongoose.Schema({
    title: { type: String, default: "", trim: true },
    text: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const researchSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    content: { type: String, default: "" },
    category: { type: String, enum: ["article", "thesis"], default: "article" },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    // Ancien format (1 seul PDF) : conserve pour ne pas casser les elements existants.
    fileName: { type: String, default: "" },
    fileType: { type: String, default: "" },
    fileUrl: { type: String, default: "" },
    // Plusieurs fichiers de tout type + plusieurs notes texte.
    files: { type: [attachmentSchema], default: [] },
    entries: { type: [entrySchema], default: [] },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Research", researchSchema);