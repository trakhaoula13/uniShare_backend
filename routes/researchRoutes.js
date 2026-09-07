const express = require("express");
const router = express.Router();
const { getResearch, createResearch, updateResearch, deleteResearch } = require("../controllers/researchController");
const { protect } = require("../middleware/authMiddleware");
const { denyViewOnly } = require("../middleware/roleGuard");

router.use(protect, denyViewOnly);

router.route("/").get(getResearch).post(createResearch);
router.route("/:id").put(updateResearch).delete(deleteResearch);

module.exports = router;
