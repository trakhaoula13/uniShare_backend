const Research = require("../models/Research");

exports.getResearch = async (req, res) => {
  const filter = { owner: req.user._id };
  if (req.query.category) filter.category = req.query.category;
  const items = await Research.find(filter).populate("course", "title color").sort({ createdAt: -1 });
  res.json(items);
};

exports.createResearch = async (req, res) => {
  const item = await Research.create({ ...req.body, owner: req.user._id });
  res.status(201).json(item);
};

exports.updateResearch = async (req, res) => {
  const item = await Research.findOne({ _id: req.params.id, owner: req.user._id });
  if (!item) return res.status(404).json({ message: "Introuvable" });
  Object.assign(item, req.body);
  await item.save();
  res.json(item);
};

exports.deleteResearch = async (req, res) => {
  const item = await Research.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!item) return res.status(404).json({ message: "Introuvable" });
  res.json({ message: "Supprime" });
};
