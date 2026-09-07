const Note = require("../models/Note");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getNotes = async (req, res) => {
  const notes = await Note.find(scopeFilter(req)).populate("course", "title color").sort({ createdAt: -1 });
  res.json(notes);
};

exports.createNote = async (req, res) => {
  const note = await Note.create({ ...req.body, owner: req.user._id });
  res.status(201).json(note);
};

exports.updateNote = async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: "Introuvable" });
  if (note.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Action non autorisee" });
  }
  Object.assign(note, req.body);
  await note.save();
  res.json(note);
};

exports.deleteNote = async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) return res.status(404).json({ message: "Introuvable" });
  if (note.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Action non autorisee" });
  }
  await note.deleteOne();
  res.json({ message: "Supprime" });
};
