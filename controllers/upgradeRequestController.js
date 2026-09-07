const UpgradeRequest = require("../models/UpgradeRequest");
const User = require("../models/User");
const AuditLog = require("../models/AuditLog");

// @route POST /api/upgrade-requests   (compte "viewonly" uniquement)
// body: { message? }
// Cree une demande de passage en compte "user", si aucune demande n'est
// deja en attente pour ce compte.
exports.createRequest = async (req, res) => {
  if (req.user.role !== "viewonly") {
    return res.status(400).json({ message: "Seul un compte en lecture seule peut demander une mise a niveau" });
  }

  const existing = await UpgradeRequest.findOne({ user: req.user._id, status: "pending" });
  if (existing) {
    return res.status(400).json({ message: "Une demande est deja en attente pour votre compte" });
  }

  const { message } = req.body;
  const request = await UpgradeRequest.create({ user: req.user._id, message: message || "" });

  res.status(201).json(request);
};

// @route GET /api/upgrade-requests/me   (compte "viewonly" uniquement)
// Renvoie la demande la plus recente du compte courant (ou null), pour
// afficher son statut sur la page "Codes d'acces".
exports.getMyRequest = async (req, res) => {
  const request = await UpgradeRequest.findOne({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(request);
};

// @route GET /api/upgrade-requests   (admin uniquement)
// ?status=pending pour ne recuperer que les demandes en attente
exports.getRequests = async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const requests = await UpgradeRequest.find(filter)
    .populate("user", "name email role major createdAt")
    .populate("resolvedBy", "name email")
    .sort({ createdAt: -1 });
  res.json(requests);
};

// @route PUT /api/upgrade-requests/:id   (admin uniquement)
// body: { action: "approve" | "reject" }
exports.resolveRequest = async (req, res) => {
  const { action } = req.body;
  if (!["approve", "reject"].includes(action)) {
    return res.status(400).json({ message: "Action invalide" });
  }

  const request = await UpgradeRequest.findById(req.params.id);
  if (!request) return res.status(404).json({ message: "Demande introuvable" });
  if (request.status !== "pending") {
    return res.status(400).json({ message: "Cette demande a deja ete traitee" });
  }

  request.status = action === "approve" ? "approved" : "rejected";
  request.resolvedBy = req.user._id;
  request.resolvedAt = new Date();
  await request.save();

  if (action === "approve") {
    const targetUser = await User.findById(request.user);
    if (targetUser && targetUser.role === "viewonly") {
      targetUser.role = "user";
      targetUser.sponsor = null;
      targetUser.sponsorCode = null;
      await targetUser.save();
    }
  }

  await AuditLog.create({
    action: "role_change",
    actor: req.user._id,
    target: request.user,
    message: action === "approve"
      ? "Demande de mise a niveau approuvee : compte passe en Etudiant"
      : "Demande de mise a niveau refusee",
  });

  const populated = await UpgradeRequest.findById(request._id)
    .populate("user", "name email role major createdAt")
    .populate("resolvedBy", "name email");

  res.json(populated);
};
