const Assignment = require("../models/Assignment");
const { scopeFilter } = require("../utils/viewOnlyScope");

const populateAll = (query) => query.populate("course", "title color").populate("reviewNotes", "title");

exports.getAssignments = async(req, res) => {
    const assignments = await populateAll(Assignment.find(scopeFilter(req)).sort({ dueDate: 1 })).lean();
    res.json(assignments);
};

exports.createAssignment = async(req, res) => {
    const created = await Assignment.create({...req.body, owner: req.user._id });
    res.status(201).json(await populateAll(Assignment.findById(created._id)));
};

exports.updateAssignment = async(req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Introuvable" });
    if (assignment.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    Object.assign(assignment, req.body);
    await assignment.save();
    res.json(await populateAll(Assignment.findById(assignment._id)));
};

exports.deleteAssignment = async(req, res) => {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ message: "Introuvable" });
    if (assignment.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    await assignment.deleteOne();
    res.json({ message: "Supprime" });
};