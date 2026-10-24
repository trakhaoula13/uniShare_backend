const User = require("../models/User");
const AuditLog = require("../models/AuditLog"); // adapte le nom/chemin si besoin

// @route GET /api/users  (admin)
exports.getUsers = async(req, res) => {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
};

// @route PUT /api/users/:id/role  (admin)
exports.updateUserRole = async(req, res) => {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    user.role = role;
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role });
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