const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Otp = require("../models/Otp");
const User = require("../models/User");

const OTP_TTL_MINUTES = 10;
const OTP_TOKEN_TTL = "15m";

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString(); // code a 6 chiffres

// @route POST /api/otp/request
// body: { email, purpose: "register" }
// Genere un code, le stocke (hashe) en base, et le renvoie EN CLAIR au
// frontend afin qu'il puisse l'inserer dans l'email envoye via EmailJS
// (envoi cote client -- voir src/services/emailService.js).
exports.requestOtp = async (req, res) => {
  try {
    const { email, purpose } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (purpose === "register") {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: "Cet email est deja utilise" });
      }
    }

    const code = generateCode();
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await Otp.findOneAndUpdate(
      { email: normalizedEmail, purpose },
      { codeHash, expiresAt },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ code, expiresInMinutes: OTP_TTL_MINUTES });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @route POST /api/otp/verify
// body: { email, code, purpose }
// Verifie le code, le supprime, puis renvoie un token JWT de courte duree
// (otpToken) attestant que cet email a ete verifie pour ce "purpose" precis.
exports.verifyOtp = async (req, res) => {
  try {
    const { email, code, purpose } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const record = await Otp.findOne({ email: normalizedEmail, purpose });

    if (!record) {
      return res.status(400).json({ message: "Aucun code demande pour cet email" });
    }
    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ message: "Le code a expire, veuillez en redemander un" });
    }

    const isValid = await bcrypt.compare(code, record.codeHash);
    if (!isValid) {
      return res.status(400).json({ message: "Code incorrect" });
    }

    await record.deleteOne();

    const otpToken = jwt.sign({ email: normalizedEmail, purpose }, process.env.JWT_SECRET, {
      expiresIn: OTP_TOKEN_TTL,
    });

    res.json({ otpToken });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
