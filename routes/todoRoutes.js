const express = require("express");
const router = express.Router();
const { getTodos, createTodo, updateTodo, deleteTodo, reorderTodos } = require("../controllers/todoController");
const { protect } = require("../middleware/authMiddleware");
const { denyViewOnly } = require("../middleware/roleGuard");

// Les taches personnelles ne font pas partie du perimetre d'un compte
// lecture seule : acces totalement bloque, meme en lecture.
router.use(protect, denyViewOnly);

router.route("/").get(getTodos).post(createTodo);
router.put("/reorder", reorderTodos);
router.route("/:id").put(updateTodo).delete(deleteTodo);

module.exports = router;
