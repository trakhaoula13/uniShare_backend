const mongoose = require("mongoose");

const scheduleSchema = new mongoose.Schema({
    day: {
        type: String,
        enum: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
        required: true,
    },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    subject: { type: String, required: true },
    room: { type: String, default: "" },
    type: { type: String, enum: ["Cours", "TD", "TP", "Examen"], default: "Cours" },
    // none = séance ponctuelle (date exacte), weekly / biweekly = séance répétée
    repeat: { type: String, enum: ["none", "weekly", "biweekly"], default: "weekly" },
    date: { type: String, default: "" }, // "YYYY-MM-DD" (séance ponctuelle)
    startDate: { type: String, default: "" }, // "YYYY-MM-DD" (début de répétition)
    endDate: { type: String, default: "" }, // "YYYY-MM-DD" (fin de répétition)
    sharedWithViewers: { type: Boolean, default: false },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

scheduleSchema.pre("validate", function(next) {
    if (this.repeat === "none" && !this.date) this.invalidate("date", "La date est obligatoire pour une séance ponctuelle");
    if (this.repeat === "biweekly" && !this.startDate) this.invalidate("startDate", "La date de début est obligatoire");
    if (this.startDate && this.endDate && this.endDate < this.startDate) this.invalidate("endDate", "La date de fin doit être après la date de début");
    next();
});

module.exports = mongoose.model("Schedule", scheduleSchema);