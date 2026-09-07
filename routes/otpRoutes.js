const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { requestOtp, verifyOtp } = require("../controllers/otpController");
const { validate } = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");

router.post(
  "/request",
  authLimiter,
  [
    body("email").isEmail().withMessage("Adresse email invalide").normalizeEmail(),
    body("purpose").equals("register").withMessage("Requete invalide"),
  ],
  validate,
  requestOtp
);

router.post(
  "/verify",
  authLimiter,
  [
    body("email").isEmail().withMessage("Adresse email invalide").normalizeEmail(),
    body("code").isLength({ min: 6, max: 6 }).withMessage("Code invalide"),
    body("purpose").equals("register").withMessage("Requete invalide"),
  ],
  validate,
  verifyOtp
);

module.exports = router;
