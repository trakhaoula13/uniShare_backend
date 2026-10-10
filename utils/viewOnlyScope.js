// Filtre commun applique aux requetes GET des ressources consultables
// (cours, devoirs/examens, notes, emploi du temps) : un compte "viewonly",
// ou un compte "user" en cours de consultation (sponsor actif via un code
// d'acces), ne voit que les elements de son "sponsor" explicitement
// marques comme partages avec les lecteurs. Un "user" sans sponsor actif
// retrouve normalement ses propres elements.
//
// Si le code utilise est "restreint" (req.codeScope, charge par le
// middleware protect), le lecteur ne voit que les cours / notes choisis
// pour ce code. `kind` indique le type de ressource demande :
//   scopeFilter(req, "course") ou scopeFilter(req, "note").
// Les autres ressources (devoirs, emploi du temps), qui appellent
// scopeFilter(req) sans type, restent invisibles avec un code restreint.
exports.scopeFilter = (req, kind) => {
    const sponsorId = req.user.sponsor && req.user.sponsor._id ? req.user.sponsor._id : req.user.sponsor;
    const isConsulting = sponsorId && (req.user.role === "viewonly" || req.user.role === "user");

    if (isConsulting) {
        const base = { owner: sponsorId, sharedWithViewers: true };
        const scope = req.codeScope;
        if (scope && scope.restricted) {
            // Avec "includeUnshared", les elements non partages sont visibles aussi.
            const owned = { owner: sponsorId };
            if (!scope.includeUnshared) owned.sharedWithViewers = true;

            if (kind === "course") return {...owned, _id: { $in: scope.courses || [] } };
            if (kind === "note") {
                // Notes cochees + (option) toutes les notes des cours choisis.
                const conditions = [{ _id: { $in: scope.notes || [] } }];
                if (scope.includeCourseContent) conditions.push({ course: { $in: scope.courses || [] } });
                return {...owned, $or: conditions };
            }
            return {...base, _id: { $in: [] } }; // autres ressources : rien
        }
        return base;
    }
    if (req.user.role === "admin" && req.query.all === "true") {
        return {};
    }
    return { owner: req.user._id };
};