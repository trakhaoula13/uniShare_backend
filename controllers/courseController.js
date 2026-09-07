const Course = require("../models/Course");
const { scopeFilter } = require("../utils/viewOnlyScope");

exports.getCourses = async(req, res) => {
    const courses = await Course.find(scopeFilter(req)).sort({ createdAt: -1 });
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
        const isVisible = course.owner.toString() === sponsorId.toString() && course.sharedWithViewers;
        if (!isVisible) return res.status(403).json({ message: "Ce cours n'est pas partage avec vous" });
    } else if (req.user.role === "viewonly") {
        // Lecteur sans sponsor actif : rien n'est visible.
        return res.status(403).json({ message: "Ce cours n'est pas partage avec vous" });
    }

    res.json(course);
};

exports.createCourse = async(req, res) => {
    const course = await Course.create({...req.body, owner: req.user._id });
    res.status(201).json(course);
};

exports.updateCourse = async(req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Cours introuvable" });
    if (course.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    Object.assign(course, req.body);
    await course.save();
    res.json(course);
};

exports.deleteCourse = async(req, res) => {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Cours introuvable" });
    if (course.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
        return res.status(403).json({ message: "Action non autorisee" });
    }
    await course.deleteOne();
    res.json({ message: "Cours supprime" });
};