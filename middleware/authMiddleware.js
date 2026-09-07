const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Le token JWT est lu depuis un cookie httpOnly (voir authController) plutot
// que depuis un header Authorization : le frontend n'a plus a le manipuler
// lui-meme (pas de localStorage, pas d'intercepteur), et il est inaccessible
// au JavaScript cote client, ce qui reduit la surface d'attaque XSS.
const protect = async(req, res, next) => {
    const token = req.cookies ? req.cookies.token : undefined;

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