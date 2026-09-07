const express = require("express");
const router = express.Router();
const { getAssignments, createAssignment, updateAssignment, deleteAssignment } = require("../controllers/assignmentController");
const { protect } = require("../middleware/authMiddleware");
const { blockViewOnly } = require("../middleware/roleGuard");

router.route("/").get(protect, getAssignments).post(protect, blockViewOnly, createAssignment);
router.route("/:id").put(protect, blockViewOnly, updateAssignment).delete(protect, blockViewOnly, deleteAssignment);

module.exports = router;
