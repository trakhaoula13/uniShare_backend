const jwt = require("jsonwebtoken");
const User = require("../models/User");

const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

// Place le JWT dans un cookie httpOnly plutot que de le renvoyer dans le
// corps JSON : le frontend n'a plus besoin de le stocker/gerer lui-meme.
// En production, le frontend (ex: Netlify) et le backend (ex: Render) sont
// deployes sur des domaines differents : un cookie "sameSite: lax" ne
// serait alors jamais envoye lors des appels API cross-origin (seulement
// lors d'une navigation top-level), et la connexion semblerait "ne rien
// faire" cote frontend. "sameSite: none" (qui exige "secure: true") est
// necessaire des que frontend et backend ne partagent pas le meme domaine.
const isProduction = process.env.NODE_ENV === "production";
const authCookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
};

const sendAuthCookie = (res, userId) => {
    const token = generateToken(userId);
    res.cookie("token", token, {
        ...authCookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
    });
};

// @route POST /api/auth/register
// body: { name, email, password, major, otpToken }
// otpToken doit provenir de POST /api/otp/verify (purpose: "register").
// Le compte est toujours cree en "viewonly" (sans sponsor), sauf le tout
// premier compte de la plateforme qui devient automatiquement "admin".
// Un compte "viewonly" peut ensuite se rattacher a un sponsor en entrant
// un code d'acces depuis la page dediee (POST /api/access-codes/redeem).
exports.register = async(req, res) => {
    try {
        const { name, email, password, major, otpToken } = req.body;

        if (!otpToken) {
            return res.status(400).json({ message: "Verification de l'email requise avant l'inscription" });
        }

        let decoded;
        try {
            decoded = jwt.verify(otpToken, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Verification expiree, veuillez recommencer" });
        }

        if (decoded.purpose !== "register" || decoded.email !== email.toLowerCase().trim()) {
            return res.status(400).json({ message: "Verification invalide pour cet email" });
        }

        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({ message: "Cet email est deja utilise" });
        }

        // Le premier utilisateur cree devient automatiquement admin, tous les
        // autres comptes demarrent en lecture seule (sans sponsor).
        const usersCount = await User.countDocuments();
        const role = usersCount === 0 ? "admin" : "viewonly";

        const user = await User.create({ name, email, password, major, role, sponsor: null });

        sendAuthCookie(res, user._id);

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sponsor: null,
            major: user.major,
            createdAt: user.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route POST /api/auth/login
exports.login = async(req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await user.matchPassword(password))) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        sendAuthCookie(res, user._id);
        await user.populate("sponsor", "name email");

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            sponsor: user.sponsor,
            avatar: user.avatar,
            major: user.major,
            createdAt: user.createdAt,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route POST /api/auth/logout
exports.logout = (req, res) => {
    res.clearCookie("token", authCookieOptions);
    res.json({ message: "Deconnecte" });
};

// @route GET /api/auth/me
exports.getMe = async(req, res) => {
    res.json(req.user);
};

const RESET_TOKEN_TTL = "30m";

// @route POST /api/auth/forgot-password
// body: { email }
// Genere un token de reinitialisation et le renvoie au frontend, qui
// construit le lien et l'envoie lui-meme par email via EmailJS (envoi
// cote client -- voir src/services/emailService.js).
exports.forgotPassword = async(req, res) => {
    try {
        const { email } = req.body;
        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "Aucun compte associe a cet email" });
        }

        const resetToken = jwt.sign({ email: normalizedEmail, purpose: "reset" }, process.env.JWT_SECRET, {
            expiresIn: RESET_TOKEN_TTL,
        });

        const nameParts = user.name ? user.name.split(" ") : [];
        res.json({
            resetToken,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @route POST /api/auth/reset-password
// body: { token, newPassword }
exports.resetPassword = async(req, res) => {
    try {
        const { token, newPassword } = req.body;

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Lien invalide ou expire, veuillez redemander un email" });
        }

        if (decoded.purpose !== "reset") {
            return res.status(400).json({ message: "Lien invalide" });
        }

        const user = await User.findOne({ email: decoded.email });
        if (!user) {
            return res.status(404).json({ message: "Utilisateur introuvable" });
        }

        user.password = newPassword; // rehashe automatiquement par le hook pre("save")
        await user.save();

        res.json({ message: "Mot de passe reinitialise avec succes" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};