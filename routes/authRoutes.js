const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { register, login, logout, getMe, forgotPassword, resetPassword } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");

router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().notEmpty().withMessage("Le nom est requis"),
    body("email").isEmail().withMessage("Adresse email invalide").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Le mot de passe doit contenir au moins 6 caracteres"),
    body("otpToken").notEmpty().withMessage("Verification de l'email requise"),
  ],
  validate,
  register
);

router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Adresse email invalide").normalizeEmail(),
    body("password").notEmpty().withMessage("Mot de passe requis"),
  ],
  validate,
  login
);

router.post("/logout", logout);

router.post(
  "/forgot-password",
  authLimiter,
  [body("email").isEmail().withMessage("Adresse email invalide").normalizeEmail()],
  validate,
  forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  [
    body("token").notEmpty().withMessage("Lien invalide"),
    body("newPassword").isLength({ min: 6 }).withMessage("Le mot de passe doit contenir au moins 6 caracteres"),
  ],
  validate,
  resetPassword
);

router.get("/me", protect, getMe);

module.exports = router;
