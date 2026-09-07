const Todo = require("../models/Todo");

exports.getTodos = async (req, res) => {
  const todos = await Todo.find({ owner: req.user._id }).sort({ order: 1, createdAt: -1 });
  res.json(todos);
};

exports.createTodo = async (req, res) => {
  // Ajoute la nouvelle tache a la fin de la liste (ordre max + 1)
  const last = await Todo.findOne({ owner: req.user._id }).sort({ order: -1 });
  const order = last ? last.order + 1 : 0;
  const todo = await Todo.create({ ...req.body, order, owner: req.user._id });
  res.status(201).json(todo);
};

exports.updateTodo = async (req, res) => {
  const todo = await Todo.findOne({ _id: req.params.id, owner: req.user._id });
  if (!todo) return res.status(404).json({ message: "Introuvable" });
  Object.assign(todo, req.body);
  await todo.save();
  res.json(todo);
};

exports.deleteTodo = async (req, res) => {
  const todo = await Todo.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!todo) return res.status(404).json({ message: "Introuvable" });
  res.json({ message: "Supprime" });
};

// @route PUT /api/todos/reorder
// body: { ids: [id1, id2, id3, ...] } -- dans le nouvel ordre souhaite
exports.reorderTodos = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ message: "Requete invalide" });
  }

  await Promise.all(
    ids.map((id, index) =>
      Todo.updateOne({ _id: id, owner: req.user._id }, { order: index })
    )
  );

  res.json({ message: "Ordre mis a jour" });
};
