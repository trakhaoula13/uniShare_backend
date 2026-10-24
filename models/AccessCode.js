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
    // Avec un code restreint :
    //  - includeCourseContent : toutes les notes (et leurs fichiers) des cours
    //    choisis sont visibles, sans avoir a cocher chaque note.
    //  - includeUnshared : visible meme si l'element est non partage (oeil barre).
    // Choix plus fins, pour les notes NON choisies en entier :
    //  - files   : adresses (fileUrl) des fichiers autorises
    //  - entries : identifiants des notes internes autorisees
    // Une page contenant au moins un de ces elements devient visible, mais
    // uniquement avec les elements choisis.
    files: [{ type: String }],
    entries: [{ type: mongoose.Schema.Types.ObjectId }],
    // Projets tutores / examens autorises, et acces (ou non) a l'emploi du temps.
    assignments: [{ type: mongoose.Schema.Types.ObjectId, ref: "Assignment" }],
    includeSchedule: { type: Boolean, default: false },
    includeCourseContent: { type: Boolean, default: false },
    includeUnshared: { type: Boolean, default: false },
    // Reutilisable : plusieurs lecteurs peuvent utiliser ce code en meme
    // temps, et un meme lecteur peut le reutiliser apres l'avoir quitte.
    // Qui l'utilise actuellement se deduit de User.sponsorCode, pas d'un
    // champ "usedBy" unique.
}, { timestamps: true });

module.exports = mongoose.model("AccessCode", accessCodeSchema);