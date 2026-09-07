const express = require("express");
const router = express.Router();
const { getSchedule, createScheduleItem, updateScheduleItem, deleteScheduleItem } = require("../controllers/scheduleController");
const { protect } = require("../middleware/authMiddleware");
const { blockViewOnly } = require("../middleware/roleGuard");

router.route("/").get(protect, getSchedule).post(protect, blockViewOnly, createScheduleItem);
router.route("/:id").put(protect, blockViewOnly, updateScheduleItem).delete(protect, blockViewOnly, deleteScheduleItem);

module.exports = router;
