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

// ============================================================
// CONFIGURATION CORS AMELIOREE
// ============================================================
// Liste des origines autorisees (environnements de dev + production)
const allowedOrigins = [
    "http://localhost:5173", // Vite dev par defaut
    "http://localhost:3000", // React / Next dev
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://universityshare.netlify.app", // Production Netlify
    "https://universityshare.netlify.com", // Fallback
    process.env.CLIENT_URL // Variable d'env personnalisee (optionnelle)
].filter(Boolean); // Supprime les eventuelles valeurs undefined

console.log("[CORS] Origines autorisees :", allowedOrigins);

app.use(cors({
    origin: function(origin, callback) {
        // Permettre les requetes sans 'origin' (ex: apps mobiles, curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn("[CORS] Origine refusee :", origin);
            callback(new Error("Cette origine n'est pas autorisee par CORS"));
        }
    },
    credentials: true, // ← CRUCIAL pour les cookies httpOnly
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin"
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400 // 24h de cache pour les preflight OPTIONS
}));

// Middlewares habituels
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use("/uploads", express.static(uploadsDir));

// Route de verification
app.get("/", (req, res) => res.json({ message: "University Dashboard API - OK" }));

// Routes
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

// 404 - Route introuvable
app.use((req, res) => {
    res.status(404).json({ message: "Route introuvable" });
});

// Gestion d'erreurs globale
app.use((err, req, res, next) => {
    console.error("[ERREUR SERVEUR]", err.stack);
    res.status(err.statusCode || 500).json({
        message: err.message || "Erreur interne du serveur",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack })
    });
});

const PORT = process.env.PORT || 5000;

// Demarrer le serveur avec gestion d'erreur pour le port
const server = app.listen(PORT, () => {
    console.log(`✅ Serveur demarre sur le port ${PORT}`);
    console.log(`   Mode : ${process.env.NODE_ENV || "development"}`);
    console.log(`   CORS autorise depuis : ${allowedOrigins.join(", ")}`);
});

// Gestion d'erreur si le port est déjà utilisé
server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Le port ${PORT} est déjà utilisé !`);
        console.log(`💡 Solutions :`);
        console.log(`   1. Tuer le processus : netstat -ano | findstr :${PORT}`);
        console.log(`   2. Changer de port dans .env : PORT=5001`);
        console.log(`   3. Redémarrer l'ordinateur\n`);
        process.exit(1);
    } else {
        throw err;
    }
});

// Gestion de l'arrêt propre du serveur
process.on('SIGINT', () => {
    console.log('\n🛑 Arrêt du serveur...');
    server.close(() => {
        console.log('✅ Serveur arrêté proprement');
        process.exit(0);
    });
});