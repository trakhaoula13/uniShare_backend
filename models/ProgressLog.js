const mongoose = require("mongoose");

// Une ligne par changement de progression d'un cours : sert a dessiner
// le mini-graphique (sparkline) d'evolution sur la carte du cours.
const progressLogSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    value: { type: Number, required: true, min: 0, max: 100 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

module.exports = mongoose.model("ProgressLog", progressLogSchema);
