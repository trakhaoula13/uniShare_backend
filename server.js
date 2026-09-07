require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");

// Verification de configuration au demarrage : evite des erreurs obscures
// type "secretOrPrivateKey must have a value" plus tard dans l'app.
if (!process.env.JWT_SECRET) {
    console.error(
        "\n[ERREUR CONFIG] JWT_SECRET est manquant dans backend/.env\n" +
        "-> Copiez backend/.env.example vers backend/.env et renseignez JWT_SECRET.\n"
    );
    process.exit(1);
}

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const courseRoutes = require("./routes/courseRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const noteRoutes = require("./routes/noteRoutes");
const todoRoutes = require("./routes/todoRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const statsRoutes = require("./routes/statsRoutes");
const quickLinkRoutes = require("./routes/quickLinkRoutes");
const researchRoutes = require("./routes/researchRoutes");
const otpRoutes = require("./routes/otpRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const accessCodeRoutes = require("./routes/accessCodeRoutes");
const upgradeRequestRoutes = require("./routes/upgradeRequestRoutes");

connectDB();

const app = express();

// Dossier de stockage des fichiers uploades (PDF) - cree s'il n'existe pas
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// CORS strict : pas de fallback "*" (incompatible avec les cookies
// d'authentification httpOnly, et trop permissif par defaut).
const CLIENT_URL = process.env.CLIENT_URL || "https://universityshare.netlify.app";
app.use(cors({ origin: CLIENT_URL, credentials: true }));

app.use(express.json({ limit: "1mb" })); // plus besoin de grosses limites : les PDF passent par /api/uploads
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => res.json({ message: "University Dashboard API - OK" }));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/assignments", assignmentRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/todos", todoRoutes);
app.use("/api/schedule", scheduleRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/quicklinks", quickLinkRoutes);
app.use("/api/research", researchRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/access-codes", accessCodeRoutes);
app.use("/api/upgrade-requests", upgradeRequestRoutes);

// 404
app.use((req, res) => res.status(404).json({ message: "Route introuvable" }));

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({ message: err.message || "Erreur serveur" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Serveur demarre sur le port ${PORT}`));