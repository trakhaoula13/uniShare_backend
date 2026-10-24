const Note = require("../models/Note");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getNotes = async(req, res) => {
    const notes = await Note.find(scopeFilter(req, "note")).populate("course", "title color").sort({ createdAt: -1 }).lean();

    // Meme regle que pour les cours : un compte qui consulte les donnees d'un
    // sponsor (role viewonly ou user rattache a un sponsor) ne voit QUE ce qui
    // est partage. Au sein d'une page partagee, chaque fichier et chaque note
    // texte doit en plus etre partage individuellement.
    const sponsorId = req.user.sponsor ? req.user.sponsor._id : null;
    const isConsulting = !!sponsorId && (req.user.role === "viewonly" || req.user.role === "user");

    if (!isConsulting) return res.json(notes);

    const scope = req.codeScope;
    const restricted = !!(scope && scope.restricted);
    const seesUnshared = restricted && !!scope.includeUnshared;

    // Code restreint : une page peut etre accordee en entier (cochee, ou cours
    // coche avec "tout le contenu"), ou seulement en partie (certains fichiers
    // ou notes internes). Dans ce dernier cas, seuls les elements choisis sont
    // envoyes : ni description, ni autres fichiers, ni autres notes internes.
    const noteIds = new Set(restricted ? (scope.notes || []).map(String) : []);
    const courseIds = new Set(restricted ? (scope.courses || []).map(String) : []);
    const fileUrls = new Set(restricted ? scope.files || [] : []);
    const entryIds = new Set(restricted ? (scope.entries || []).map(String) : []);

    const visibleItem = (item) => seesUnshared || item.sharedWithViewers;

    const filtered = notes.map((note) => {
        const obj = {...note }; // requete "lean" : deja un objet simple

        if (!restricted) {
            // Ancien code : tout ce qui est partage, fichier par fichier.
            obj.files = (obj.files || []).filter((f) => f.sharedWithViewers);
            obj.entries = (obj.entries || []).filter((e) => e.sharedWithViewers);
            return obj;
        }

        const courseId = String((obj.course && obj.course._id) || obj.course);
        const full = noteIds.has(String(obj._id)) || (scope.includeCourseContent && courseIds.has(courseId));

        if (full) {
            obj.files = (obj.files || []).filter(visibleItem);
            obj.entries = (obj.entries || []).filter(visibleItem);
            return obj;
        }

        // Page partielle
        obj.content = "";
        obj.files = (obj.files || []).filter((f) => fileUrls.has(f.fileUrl) && visibleItem(f));
        obj.entries = (obj.entries || []).filter((e) => entryIds.has(String(e._id)) && visibleItem(e));
        if (!fileUrls.has(obj.fileUrl)) {
            obj.fileUrl = "";
            obj.fileName = "";
            obj.fileType = "";
        }
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