const express = require("express");
const router = express.Router();
const { getUsers, updateUserRole, deleteUser, updateProfile, getAuditLog } = require("../controllers/userController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.put("/profile", protect, updateProfile);
router.get("/", protect, adminOnly, getUsers);
router.get("/audit-log", protect, adminOnly, getAuditLog);
router.put("/:id/role", protect, adminOnly, updateUserRole);
router.delete("/:id", protect, adminOnly, deleteUser);

module.exports = router;
