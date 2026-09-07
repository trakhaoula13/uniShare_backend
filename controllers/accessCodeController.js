const crypto = require("crypto");
const AccessCode = require("../models/AccessCode");
const AuditLog = require("../models/AuditLog");
const User = require("../models/User");

const generateUniqueCode = async() => {
    let code;
    let exists = true;
    while (exists) {
        code = crypto.randomBytes(4).toString("hex").toUpperCase(); // ex: 3F9A2B7C
        exists = await AccessCode.exists({ code });
    }
    return code;
};

// @route POST /api/access-codes
// body: { expiresInDays } (optionnel)
// Genere un code d'acces pour un futur compte "viewonly". Reserve aux
// comptes "user" et "admin" (un compte viewonly ne peut pas en generer).
exports.generateCode = async(req, res) => {
    const code = await generateUniqueCode();
    const { expiresInDays } = req.body;
    const expiresAt = expiresInDays ? new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000) : null;

    const accessCode = await AccessCode.create({ code, createdBy: req.user._id, expiresAt });
    await AuditLog.create({ action: "code_created", actor: req.user._id, message: `Code d'acces ${code} genere` });

    res.status(201).json(accessCode);
};

// @route GET /api/access-codes  (?all=true reserve a l'admin)
exports.getCodes = async(req, res) => {
    const filter = req.user.role === "admin" && req.query.all === "true" ? {} : { createdBy: req.user._id };
    const codes = await AccessCode.find(filter)
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });

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