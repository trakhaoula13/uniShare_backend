const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["user", "admin", "viewonly"], default: "user" },
    // Pour un compte "viewonly" : l'utilisateur (user/admin) dont il consulte
    // les donnees partagees (cours/devoirs/notes/emploi du temps marques
    // "partages avec les lecteurs").
    sponsor: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    // Le code d'acces precis utilise pour se rattacher au sponsor actuel.
    // Un meme code peut etre utilise par plusieurs lecteurs a la fois, et un
    // lecteur peut le reutiliser plusieurs fois (sortir puis revenir).
    sponsorCode: { type: mongoose.Schema.Types.ObjectId, ref: "AccessCode", default: null },
    avatar: { type: String, default: "" },
    major: { type: String, default: "" },
}, { timestamps: true });

userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
    return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);