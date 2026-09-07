// Filtre commun applique aux requetes GET des ressources consultables
// (cours, devoirs/examens, notes, emploi du temps) : un compte "viewonly",
// ou un compte "user" en cours de consultation (sponsor actif via un code
// d'acces), ne voit que les elements de son "sponsor" explicitement
// marques comme partages avec les lecteurs. Un "user" sans sponsor actif
// retrouve normalement ses propres elements.
exports.scopeFilter = (req) => {
    const sponsorId = req.user.sponsor && req.user.sponsor._id ? req.user.sponsor._id : req.user.sponsor;
    const isConsulting = sponsorId && (req.user.role === "viewonly" || req.user.role === "user");

    if (isConsulting) {
        return { owner: sponsorId, sharedWithViewers: true };
    }
    if (req.user.role === "admin" && req.query.all === "true") {
        return {};
    }
    return { owner: req.user._id };
};