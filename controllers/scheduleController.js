const Schedule = require("../models/Schedule");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getSchedule = async (req, res) => {
  const items = await Schedule.find(scopeFilter(req)).sort({ day: 1, startTime: 1 });
  res.json(items);
};

exports.createScheduleItem = async (req, res) => {
  const item = await Schedule.create({ ...req.body, owner: req.user._id });
  res.status(201).json(item);
};

exports.updateScheduleItem = async (req, res) => {
  const item = await Schedule.findOne({ _id: req.params.id, owner: req.user._id });
  if (!item) return res.status(404).json({ message: "Introuvable" });
  Object.assign(item, req.body);
  await item.save();
  res.json(item);
};

exports.deleteScheduleItem = async (req, res) => {
  const item = await Schedule.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!item) return res.status(404).json({ message: "Introuvable" });
  res.json({ message: "Supprime" });
};
