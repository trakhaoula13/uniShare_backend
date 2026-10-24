const mongoose = require("mongoose");

// Projets tutores ("assignment") et examens ("exam") dans la meme collection.
const assignmentSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    // Description / objectifs (projet) ou notes generales (examen)
    description: { type: String, default: "" },
    type: { type: String, enum: ["assignment", "exam"], default: "assignment" },
    // Cours associe (projet) ou matiere (examen)
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },

    // Date de livraison (projet) ou date de l'examen
    dueDate: { type: Date, required: true },

    // Statut. "pending" est l'ancienne valeur (equivalent de "todo").
    //  projet : todo | in_progress | done      examen : upcoming | past
    status: {
        type: String,
        enum: ["pending", "todo", "in_progress", "done", "upcoming", "past"],
        default: "todo",
    },

    // --- Projets tutores ---
    startDate: { type: Date },
    progress: { type: Number, min: 0, max: 100, default: 0 },
    priority: { type: String, enum: ["haute", "moyenne", "basse"], default: "moyenne" },

    // --- Examens ---
    startTime: { type: String, default: "" }, // "HH:MM"
    duration: { type: Number, min: 0, default: 0 }, // minutes
    room: { type: String, default: "" },
    syllabus: { type: String, default: "" }, // programme / chapitres a reviser
    reviewNotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }], // notes de revision liees
    grade: { type: Number, min: 0, max: 20, default: null }, // note obtenue

    sharedWithViewers: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

assignmentSchema.index({ owner: 1, dueDate: 1 });

module.exports = mongoose.model("Assignment", assignmentSchema);