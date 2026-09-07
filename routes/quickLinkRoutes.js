const express = require("express");
const router = express.Router();
const { getQuickLinks, createQuickLink, updateQuickLink, deleteQuickLink } = require("../controllers/quickLinkController");
const { protect } = require("../middleware/authMiddleware");
const { denyViewOnly } = require("../middleware/roleGuard");

router.use(protect, denyViewOnly);

router.route("/").get(getQuickLinks).post(createQuickLink);
router.route("/:id").put(updateQuickLink).delete(deleteQuickLink);

module.exports = router;
