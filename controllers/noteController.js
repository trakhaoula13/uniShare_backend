const Note = require("../models/Note");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getNotes = async(req, res) => {
    const notes = await Note.find(scopeFilter(req, "note")).populate("course", "title color").sort({ createdAt: -1 });

    // Meme regle que pour les cours : un compte qui consulte les donnees d'un
    // sponsor (role viewonly ou user rattache a un sponsor) ne voit QUE ce qui
    // est partage. Au sein d'une page partagee, chaque fichier et chaque note
    // texte doit en plus etre partage individuellement.
    const sponsorId = req.user.sponsor ? req.user.sponsor._id : null;
    const isConsulting = !!sponsorId && (req.user.role === "viewonly" || req.user.role === "user");

    if (!isConsulting) return res.json(notes);

    // Code restreint avec "includeUnshared" : tous les fichiers et toutes les
    // notes des pages visibles, y compris ceux non partages individuellement.
    const scope = req.codeScope;
    if (scope && scope.restricted && scope.includeUnshared) return res.json(notes);

    const filtered = notes.map((note) => {
        const obj = note.toObject();
        obj.files = (obj.files || []).filter((f) => f.sharedWithViewers);
        obj.entries = (obj.entries || []).filter((e) => e.sharedWithViewers);
        return obj;
    });
    res.json(filtered);
};

exports.createNote = async(req, res) => {
    const note = await Note.create({...req.body, owner: req.user._id });
    res.status(201).json(note);
};

exports.updateNote = async(req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Introuvable" });
    if (note.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    Object.assign(note, req.body);
    await note.save();
    res.json(note);
};

exports.deleteNote = async(req, res) => {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Introuvable" });
    if (note.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    await note.deleteOne();
    res.json({ message: "Supprime" });
};