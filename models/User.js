const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 15 * 60 * 1000; // 15 minutes

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
    // Verrouillage de compte apres plusieurs echecs de connexion.
    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },
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

userSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

// Appelee apres un mot de passe incorrect. Incremente le compteur et
// verrouille le compte 15 min au 5e echec consecutif.
userSchema.methods.registerFailedLogin = async function() {
    // Si un ancien verrou est expire, on repart de zero.
    if (this.lockUntil && this.lockUntil <= Date.now()) {
        this.failedLoginAttempts = 1;
        this.lockUntil = null;
    } else {
        this.failedLoginAttempts += 1;
    }

    if (this.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        this.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
    }

    await this.save();
};

// Appelee apres une connexion reussie : remet le compteur a zero.
userSchema.methods.resetFailedLogins = async function() {
    if (this.failedLoginAttempts > 0 || this.lockUntil) {
        this.failedLoginAttempts = 0;
        this.lockUntil = null;
        await this.save();
    }
};

module.exports = mongoose.model("User", userSchema);