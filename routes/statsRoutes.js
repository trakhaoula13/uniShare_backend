const express = require("express");
const router = express.Router();
const { getMyStats, getAdminStats } = require("../controllers/statsController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { denyViewOnly } = require("../middleware/roleGuard");

router.get("/me", protect, denyViewOnly, getMyStats);
router.get("/admin", protect, adminOnly, getAdminStats);

module.exports = router;
