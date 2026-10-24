const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema({
    text: { type: String, required: true, trim: true },
    // "done" est conserve pour compatibilite ; "status" decide de la colonne.
    done: { type: Boolean, default: false },
    status: { type: String, enum: ["todo", "in_progress", "review", "done"], default: "todo" },
    priority: { type: String, enum: ["urgent", "important", "normal"], default: "normal" },
    order: { type: Number, default: 0 },
    dueDate: { type: Date },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

todoSchema.index({ owner: 1, order: 1 });

module.exports = mongoose.model("Todo", todoSchema);