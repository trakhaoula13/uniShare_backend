const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { generateCode, getCodes, getShareOptions, updateCode, revokeCode, redeemCode, leaveSponsor } = require("../controllers/accessCodeController");
const { protect } = require("../middleware/authMiddleware");
const { denyViewOnly } = require("../middleware/roleGuard");
const { validate } = require("../middleware/validate");

router.post("/", protect, denyViewOnly, generateCode);
router.get("/", protect, denyViewOnly, getCodes);
// Cours et notes du proprietaire, pour choisir ce qu'un code donne a voir.
router.get("/options", protect, denyViewOnly, getShareOptions);
router.post(
    "/redeem",
    protect, [body("code").trim().notEmpty().withMessage("Code requis")],
    validate,
    redeemCode
);
router.post("/leave", protect, leaveSponsor);
router.put("/:id", protect, denyViewOnly, updateCode);
router.delete("/:id", protect, denyViewOnly, revokeCode);

module.exports = router;