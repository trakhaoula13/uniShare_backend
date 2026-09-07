const Assignment = require("../models/Assignment");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getAssignments = async (req, res) => {
  const assignments = await Assignment.find(scopeFilter(req)).populate("course", "title color").sort({ dueDate: 1 });
  res.json(assignments);
};

exports.createAssignment = async (req, res) => {
  const assignment = await Assignment.create({ ...req.body, owner: req.user._id });
  res.status(201).json(assignment);
};

exports.updateAssignment = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: "Introuvable" });
  if (assignment.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Action non autorisee" });
  }
  Object.assign(assignment, req.body);
  await assignment.save();
  res.json(assignment);
};

exports.deleteAssignment = async (req, res) => {
  const assignment = await Assignment.findById(req.params.id);
  if (!assignment) return res.status(404).json({ message: "Introuvable" });
  if (assignment.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
    return res.status(403).json({ message: "Action non autorisee" });
  }
  await assignment.deleteOne();
  res.json({ message: "Supprime" });
};
