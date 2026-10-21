const express = require("express");
const router = express.Router();
const { getCourses, getCourse, createCourse, updateCourse, deleteCourse, getProgressHistory } = require("../controllers/courseController");
const { protect } = require("../middleware/authMiddleware");
const { blockViewOnly } = require("../middleware/roleGuard");

router.route("/").get(protect, getCourses).post(protect, blockViewOnly, createCourse);
// Doit rester AVANT "/:id", sinon "progress-history" serait lu comme un identifiant.
router.get("/progress-history", protect, getProgressHistory);
router.route("/:id").get(protect, getCourse).put(protect, blockViewOnly, updateCourse).delete(protect, blockViewOnly, deleteCourse);

module.exports = router;