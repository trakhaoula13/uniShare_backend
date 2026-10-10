const crypto = require("crypto");
const mongoose = require("mongoose");
const AccessCode = require("../models/AccessCode");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");
const Course = require("../models/Course");
const Note = require("../models/Note");

const generateUniqueCode = async() => {
    let code;
    let exists = true;
    while (exists) {
        code = crypto.randomBytes(4).toString("hex").toUpperCase(); // ex: 3F9A2B7C
        exists = await AccessCode.exists({ code });
    }
    return code;
};

// Lit la portee demandee (body : { restricted, courseIds, noteIds }) et ne
// garde que les cours/notes qui appartiennent bien a l'utilisateur courant :
// impossible de donner acces a l'element d'un autre.
const readScope = async(req) => {
    const { restricted, courseIds, noteIds, includeCourseContent, includeUnshared } = req.body;
    if (!restricted) return { restricted: false, courses: [], notes: [], includeCourseContent: false, includeUnshared: false };

    const onlyValid = (list) => (Array.isArray(list) ? list.filter((id) => mongoose.isValidObjectId(id)) : []);
    const [courses, notes] = await Promise.all([
        Course.find({ _id: { $in: onlyValid(courseIds) }, owner: req.user._id }).select("_id"),
        Note.find({ _id: { $in: onlyValid(noteIds) }, owner: req.user._id }).select("_id"),
    ]);
    return {
        restricted: true,
        courses: courses.map((c) => c._id),
        notes: notes.map((n) => n._id),
        includeCourseContent: !!includeCourseContent,
        includeUnshared: !!includeUnshared,
    };
};

const populateScope = (query) => query.populate("courses", "title color").populate("notes", "title");

// @route POST /api/access-codes
// body: { expiresInDays?, restricted?, courseIds?, noteIds? }
// Genere un code d'acces pour un futur compte "viewonly". Reserve aux
// comptes "user" et "admin" (un compte viewonly ne peut pas en generer).
// Avec restricted = true, le code ne donne acces qu'aux cours et notes choisis.
exports.generateCode = async(req, res) => {
    const scope = await readScope(req);
    if (scope.restricted && scope.courses.length === 0 && scope.notes.length === 0) {
        return res.status(400).json({ message: "Choisissez au moins un cours ou une note pour ce code" });
    }

    const code = await generateUniqueCode();
    const { expiresInDays } = req.body;
    const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000) : null;

    const created = await AccessCode.create({ code, createdBy: req.user._id, expiresAt, ...scope });
    await AuditLog.create({
        action: "code_created",
        actor: req.user._id,
        message: scope.restricted ?
            `Code d'acces ${code} genere (${scope.courses.length} cours, ${scope.notes.length} notes)` : `Code d'acces ${code} genere`,
    });

    const populated = await populateScope(AccessCode.findById(created._id));
    res.status(201).json({...populated.toObject(), activeUsers: [] });
};

// @route PUT /api/access-codes/:id
// body: { restricted, courseIds, noteIds }
// Modifie ce qu'un code existant donne a voir. S'applique tout de suite aux
// lecteurs deja connectes avec ce code.
exports.updateCode = async(req, res) => {
        const accessCode = await AccessCode.findById(req.params.id);
        if (!accessCode) return res.status(404).json({ message: "Code introuvable" });
        if (accessCode.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
            return res.status(403).json({ message: "Action non autorisee" });
        }

        const scope = await readScope(req);
        if (scope.restricted && scope.courses.length === 0 && scope.notes.length === 0) {
            return res.status(400).json({ message: "Choisissez au moins un cours ou une note pour ce code" });
        }

        accessCode.restricted = scope.restricted;
        accessCode.courses = scope.courses;
        accessCode.notes = scope.notes;
        accessCode.includeCourseContent = scope.includeCourseContent;
        accessCode.includeUnshared = scope.includeUnshared;
        await accessCode.save();
        await AuditLog.create({
                    action: "code_created",
                    actor: req.user._id,
                    message: `Acces du code ${accessCode.code} modifie (${scope.restricted ? `${scope.courses.length} cours, ${scope.notes.length} notes` : "tout ce qui est partage"})`,
    });

    const populated = await populateScope(AccessCode.findById(accessCode._id));
    res.json(populated.toObject());
};

// @route GET /api/access-codes/options
// Cours et notes de l'utilisateur courant (et non ceux d'un sponsor
// consulte), pour choisir ce qu'un code donne a voir.
exports.getShareOptions = async(req, res) => {
    const [courses, notes] = await Promise.all([
        Course.find({ owner: req.user._id }).select("title code color sharedWithViewers").sort({ createdAt: 1 }).lean(),
        Note.find({ owner: req.user._id }).select("title course sharedWithViewers").sort({ createdAt: 1 }).lean(),
    ]);
    res.json({ courses, notes });
};

// @route GET /api/access-codes  (?all=true reserve a l'admin)
exports.getCodes = async(req, res) => {
    const filter = req.user.role === "admin" && req.query.all === "true" ? {} : { createdBy: req.user._id };
    const codes = await populateScope(AccessCode.find(filter).populate("createdBy", "name email").sort({ createdAt: -1 }));

    // Un code est reutilisable : plusieurs lecteurs peuvent l'utiliser en
    // meme temps. On calcule pour chaque code la liste des lecteurs
    // actuellement rattaches via ce code precis (User.sponsorCode).
    const codeIds = codes.map((c) => c._id);
    const activeUsers = await User.find({ sponsorCode: { $in: codeIds } })
        .select("name email sponsorCode")
        .lean();

    const usersByCode = {};
    for (const u of activeUsers) {
        const key = u.sponsorCode.toString();
        if (!usersByCode[key]) usersByCode[key] = [];
        usersByCode[key].push({ _id: u._id, name: u.name, email: u.email });
    }

    const withUsers = codes.map((c) => ({
        ...c.toObject(),
        activeUsers: usersByCode[c._id.toString()] || [],
    }));

    res.json(withUsers);
};

// @route DELETE /api/access-codes/:id  (revocation)
exports.revokeCode = async(req, res) => {
    const accessCode = await AccessCode.findById(req.params.id);
    if (!accessCode) return res.status(404).json({ message: "Code introuvable" });
    if (accessCode.createdBy.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }

    accessCode.revoked = true;
    await accessCode.save();
    await AuditLog.create({ action: "code_revoked", actor: req.user._id, message: `Code d'acces ${accessCode.code} revoque` });

    res.json({ message: "Code revoque" });
};

// @route POST /api/access-codes/redeem
// body: { code }
// Rattache le compte "viewonly" OU "user" courant au createur du code (son
// "sponsor") pour consulter ses elements partages. Pour un compte "user",
// cela ne change pas son role : il garde son propre compte et pourra
// revenir a ses propres elements en quittant (POST /leave). Un code est
// reutilisable : plusieurs comptes peuvent l'utiliser en meme temps, et un
// meme compte peut le reutiliser autant de fois que necessaire.
exports.redeemCode = async(req, res) => {
    if (!["viewonly", "user"].includes(req.user.role)) {
        return res.status(400).json({ message: "Seul un compte Etudiant ou Lecture seule peut utiliser un code" });
    }

    const { code } = req.body;
    const normalizedCode = code ? code.toUpperCase().trim() : undefined;
    const accessCode = await AccessCode.findOne({ code: normalizedCode });

    if (!accessCode || accessCode.revoked) {
        return res.status(400).json({ message: "Code invalide" });
    }
    if (accessCode.expiresAt && accessCode.expiresAt < new Date()) {
        return res.status(400).json({ message: "Ce code a expire" });
    }
    if (accessCode.createdBy.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: "Vous ne pouvez pas utiliser votre propre code" });
    }

    const user = await User.findById(req.user._id);
    const previousSponsor = user.sponsor;
    user.sponsor = accessCode.createdBy;
    user.sponsorCode = accessCode._id;
    await user.save();

    await AuditLog.create({
        action: "code_redeemed",
        actor: req.user._id,
        target: accessCode.createdBy,
        message: previousSponsor ?
            `Compte reattache en consultation via le code ${accessCode.code}` : `Compte rattache en consultation via le code ${accessCode.code}`,
    });

    const updated = await User.findById(user._id).select("-password").populate("sponsor", "name email");

    res.json({
        message: "Votre compte consulte maintenant les elements partages par ce sponsor",
        user: updated,
    });
};

// @route POST /api/access-codes/leave
// Detache le compte "viewonly" OU "user" courant de son sponsor actuel.
// Pour un compte "user", il retrouve immediatement ses propres elements
// (cours, devoirs, notes, emploi du temps) puisque son role n'a jamais
// change.
exports.leaveSponsor = async(req, res) => {
    if (!["viewonly", "user"].includes(req.user.role)) {
        return res.status(400).json({ message: "Seul un compte Etudiant ou Lecture seule peut quitter un sponsor" });
    }

    const user = await User.findById(req.user._id);
    if (!user.sponsor) {
        return res.status(400).json({ message: "Ce compte n'est rattache a aucun sponsor" });
    }

    user.sponsor = null;
    user.sponsorCode = null;
    await user.save();

    await AuditLog.create({
        action: "code_redeemed",
        actor: req.user._id,
        message: "Compte detache de son sponsor, retour a son propre compte",
    });

    const updated = await User.findById(user._id).select("-password").populate("sponsor", "name email");
    res.json({ message: "Vous avez quitte ce sponsor", user: updated });
};