const express = require("express");
const router = express.Router();
const { getNotes, createNote, updateNote, deleteNote } = require("../controllers/noteController");
const { protect } = require("../middleware/authMiddleware");
const { blockViewOnly } = require("../middleware/roleGuard");

router.route("/").get(protect, getNotes).post(protect, blockViewOnly, createNote);
router.route("/:id").put(protect, blockViewOnly, updateNote).delete(protect, blockViewOnly, deleteNote);

module.exports = router;
