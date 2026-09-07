const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const {
  createRequest,
  getMyRequest,
  getRequests,
  resolveRequest,
} = require("../controllers/upgradeRequestController");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const { validate } = require("../middleware/validate");

router.post(
  "/",
  protect,
  [body("message").optional().isString().isLength({ max: 300 })],
  validate,
  createRequest
);
router.get("/me", protect, getMyRequest);
router.get("/", protect, adminOnly, getRequests);
router.put(
  "/:id",
  protect,
  adminOnly,
  [body("action").isIn(["approve", "reject"]).withMessage("Action invalide")],
  validate,
  resolveRequest
);

module.exports = router;
