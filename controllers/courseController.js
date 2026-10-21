const Course = require("../models/Course");
const ProgressLog = require("../models/ProgressLog");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getCourses = async(req, res) => {
    const courses = await Course.find(scopeFilter(req, "course")).sort({ createdAt: -1 });
    res.json(courses);
};

exports.getCourse = async(req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Cours introuvable" });

    // req.user.sponsor est peuple (objet {_id, name, email}) par le middleware
    // "protect" : il faut comparer sur son _id, pas sur l'objet lui-meme.
    const sponsorId = req.user.sponsor ? req.user.sponsor._id : undefined;
    const isConsulting = sponsorId && (req.user.role === "viewonly" || req.user.role === "user");

    if (isConsulting) {
        // Code restreint avec "includeUnshared" : un cours non partage reste visible.
        const scope = req.codeScope;
        const seesUnshared = !!(scope && scope.restricted && scope.includeUnshared);
        const isVisible = course.owner.toString() === sponsorId.toString() && (course.sharedWithViewers || seesUnshared);
        // Code restreint : le cours doit aussi faire partie de ceux choisis.
        const inScope = !(scope && scope.restricted) ||
            (scope.courses || []).some((id) => id.toString() === course._id.toString());
        if (!isVisible || !inScope) return res.status(403).json({ message: "Ce cours n'est pas partage avec vous" });
    } else if (req.user.role === "viewonly") {
        // Lecteur sans sponsor actif : rien n'est visible.
        return res.status(403).json({ message: "Ce cours n'est pas partage avec vous" });
    }

    res.json(course);
};

exports.createCourse = async(req, res) => {
    const course = await Course.create({...req.body, owner: req.user._id });
    // Point de depart de l'historique de progression (sparkline).
    await ProgressLog.create({ owner: course.owner, course: course._id, value: course.progress || 0 });
    res.status(201).json(course);
};

// @route GET /api/courses/progress-history
// Evolution de la progression de chaque cours : { [idCours]: [valeurs...] }
exports.getProgressHistory = async(req, res) => {
    const logs = await ProgressLog.find({ owner: req.user._id }).sort({ createdAt: 1 }).lean();
    const byCourse = {};
    for (const log of logs) {
        const key = String(log.course);
        (byCourse[key] = byCourse[key] || []).push(log.value);
    }
    Object.keys(byCourse).forEach((key) => { byCourse[key] = byCourse[key].slice(-20); });
    res.json(byCourse);
};

exports.updateCourse = async(req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Cours introuvable" });
    if (course.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    const previousProgress = course.progress;
    Object.assign(course, req.body);
    await course.save();
    // On garde une trace chaque fois que la progression change.
    if (req.body.progress !== undefined && course.progress !== previousProgress) {
        await ProgressLog.create({ owner: course.owner, course: course._id, value: course.progress });
    }
    res.json(course);
};

exports.deleteCourse = async(req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Cours introuvable" });
    if (course.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    await course.deleteOne();
    await ProgressLog.deleteMany({ course: course._id });
    res.json({ message: "Cours supprime" });
};