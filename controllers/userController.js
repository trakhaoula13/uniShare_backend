const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

// @route GET /api/users  (admin)
exports.getUsers = async(req, res) => {
    const users = await User.find().select("-password").populate("sponsor", "name email").sort({ createdAt: -1 });
    res.json(users);
};

// @route PUT /api/users/:id/role  (admin)
// body: { role } -- "user" | "admin" | "viewonly"
exports.updateUserRole = async(req, res) => {
    const { role } = req.body;
    if (!["user", "admin", "viewonly"].includes(role)) {
        return res.status(400).json({ message: "Role invalide" });
    }

    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "Utilisateur introuvable" });

    const previousRole = target.role;
    target.role = role;
    // Un compte qui redevient "user" ou "admin" n'a plus de sponsor
    if (role !== "viewonly") {
        target.sponsor = null;
        target.sponsorCode = null;
    }
    await target.save();

    await AuditLog.create({
        action: "role_change",
        actor: req.user._id,
        target: target._id,
        message: `Role change de "${previousRole}" a "${role}"`,
    });

    const updated = await User.findById(target._id).select("-password").populate("sponsor", "name email");
    res.json(updated);
};

// @route DELETE /api/users/:id  (admin)
exports.deleteUser = async(req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json({ message: "Utilisateur supprime" });
};

// @route PUT /api/users/profile
exports.updateProfile = async(req, res) => {
    if (req.user.role === "viewonly") {
        return res.status(403).json({ message: "Ce compte est en lecture seule" });
    }

    const { name, major, avatar } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    user.name = name !== undefined ? name : user.name;
    user.major = major !== undefined ? major : user.major;
    user.avatar = avatar !== undefined ? avatar : user.avatar;
    await user.save();

    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, major: user.major, avatar: user.avatar });
};

// @route GET /api/users/audit-log  (admin)
exports.getAuditLog = async(req, res) => {
    const logs = await AuditLog.find()
        .populate("actor", "name email")
        .populate("target", "name email")
        .sort({ createdAt: -1 })
        .limit(100);
    res.json(logs);
};