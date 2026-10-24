const User = require("../models/User");
const AuditLog = require("../models/AuditLog"); // adapte le nom/chemin si besoin

// @route GET /api/users  (admin)
exports.getUsers = async(req, res) => {
    const users = await User.find()
        .select("-password")
        .populate("sponsor", "name email")
        .populate("sponsorCode", "code")
        .sort({ createdAt: -1 });
    res.json(users);
};

// @route PUT /api/users/:id/role  (admin)
exports.updateUserRole = async(req, res) => {
    const { role } = req.body;
    if (!["user", "admin", "viewonly"].includes(role)) {
        return res.status(400).json({ message: "Role invalide" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const previousRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
        action: "role_change",
        actor: req.user._id,
        target: user._id,
        message: `Role modifie : ${previousRole} -> ${role}`,
    });

    // On renvoie la meme forme que GET /api/users (sponsor et date inclus),
    // sinon la ligne du tableau admin perd ces champs apres un changement.
    const updated = await User.findById(user._id)
        .select("-password")
        .populate("sponsor", "name email")
        .populate("sponsorCode", "code");
    res.json(updated);
};

// @route DELETE /api/users/:id  (admin)
exports.deleteUser = async(req, res) => {
    if (String(req.params.id) === String(req.user._id)) {
        return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ message: "Supprime" });
};

// @route PUT /api/users/profile
exports.updateProfile = async(req, res) => {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.email !== undefined) user.email = req.body.email;
    if (req.body.password) user.password = req.body.password; // hache par le hook du modele

    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
};

// @route GET /api/users/audit-log  (admin)
exports.getAuditLog = async(req, res) => {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
};