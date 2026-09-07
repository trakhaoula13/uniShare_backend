const rateLimit = require("express-rate-limit");

// Limite stricte pour les routes sensibles (login, register, otp, reset).
// Empeche le bruteforce de mots de passe et le spam de codes OTP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Trop de tentatives, veuillez reessayer dans quelques minutes." },
});

module.exports = { authLimiter };
