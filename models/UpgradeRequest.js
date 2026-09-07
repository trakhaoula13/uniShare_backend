const mongoose = require("mongoose");

// Demande d'un compte "viewonly" pour passer en compte "user" (etudiant),
// soumise a validation d'un administrateur depuis la page Administration.
const upgradeRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    message: { type: String, default: "", trim: true, maxlength: 300 },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UpgradeRequest", upgradeRequestSchema);
