const mongoose = require("mongoose");

const accessCodeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    expiresAt: { type: Date, default: null }, // null = pas d'expiration
    revoked: { type: Boolean, default: false },
    // Portee de l'acces donne par ce code :
    //  - restricted = false : comportement historique, le lecteur voit tout
    //    ce qui est partage (cours, devoirs, notes, emploi du temps).
    //  - restricted = true  : le lecteur ne voit QUE les cours et les notes
    //    listes ci-dessous (et seulement s'ils sont aussi partages).
    restricted: { type: Boolean, default: false },
    courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
    notes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Note" }],
    // Reutilisable : plusieurs lecteurs peuvent utiliser ce code en meme
    // temps, et un meme lecteur peut le reutiliser apres l'avoir quitte.
    // Qui l'utilise actuellement se deduit de User.sponsorCode, pas d'un
    // champ "usedBy" unique.
}, { timestamps: true });

module.exports = mongoose.model("AccessCode", accessCodeSchema);