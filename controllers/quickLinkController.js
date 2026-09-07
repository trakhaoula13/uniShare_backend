const QuickLink = require("../models/QuickLink");

exports.getQuickLinks = async (req, res) => {
  const links = await QuickLink.find({ owner: req.user._id }).sort({ createdAt: 1 });
  res.json(links);
};

exports.createQuickLink = async (req, res) => {
  const link = await QuickLink.create({ ...req.body, owner: req.user._id });
  res.status(201).json(link);
};

exports.updateQuickLink = async (req, res) => {
  const link = await QuickLink.findOne({ _id: req.params.id, owner: req.user._id });
  if (!link) return res.status(404).json({ message: "Introuvable" });
  Object.assign(link, req.body);
  await link.save();
  res.json(link);
};

exports.deleteQuickLink = async (req, res) => {
  const link = await QuickLink.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!link) return res.status(404).json({ message: "Introuvable" });
  res.json({ message: "Supprime" });
};
