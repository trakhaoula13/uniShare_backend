const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Le token JWT est lu depuis le header Authorization ("Bearer <token>").
// Evite les problemes de cookies tiers (SameSite/third-party) entre
// domaines differents (frontend Netlify / backend Render).
const protect = async(req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ?
        authHeader.split(" ")[1] :
        undefined;

    if (!token) {
        return res.status(401).json({ message: "Non autorise, veuillez vous reconnecter" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password").populate("sponsor", "name email");
        if (!req.user) {
            return res.status(401).json({ message: "Utilisateur introuvable" });
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Session expiree, veuillez vous reconnecter" });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        return next();
    }
    return res.status(403).json({ message: "Acces reserve aux administrateurs" });
};

module.exports = { protect, adminOnly };