const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { generateCode, getCodes, revokeCode, redeemCode, leaveSponsor } = require("../controllers/accessCodeController");
const { protect } = require("../middleware/authMiddleware");
const { denyViewOnly } = require("../middleware/roleGuard");
const { validate } = require("../middleware/validate");

router.post("/", protect, denyViewOnly, generateCode);
router.get("/", protect, denyViewOnly, getCodes);
router.delete("/:id", protect, denyViewOnly, revokeCode);
router.post(
    "/redeem",
    protect, [body("code").trim().notEmpty().withMessage("Code requis")],
    validate,
    redeemCode
);
router.post("/leave", protect, leaveSponsor);

module.exports = router;