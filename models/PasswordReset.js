const mongoose = require("mongoose");

// Jeton de reinitialisation de mot de passe : contrairement a un JWT
// autoporte (valide tant qu'il n'a pas expire, meme apres utilisation), on
// stocke ici son empreinte (sha256) et on le supprime des qu'il est
// utilise -- un lien de reset ne peut donc servir qu'une seule fois.
const passwordResetSchema = new mongoose.Schema({
    email: { type: String, required: true, lowercase: true, trim: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
}, { timestamps: true });

// Une seule demande de reset active par email : une nouvelle demande
// invalide automatiquement le lien precedent.
passwordResetSchema.index({ email: 1 }, { unique: true });

module.exports = mongoose.model("PasswordReset", passwordResetSchema);