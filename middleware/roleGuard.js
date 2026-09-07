// Bloque toute action d'ECRITURE (creer/modifier/supprimer) pour un compte
// "viewonly". A placer apres "protect" sur les routes POST/PUT/DELETE des
// ressources consultables (cours, devoirs, notes, emploi du temps).
exports.blockViewOnly = (req, res, next) => {
  if (req.user.role === "viewonly") {
    return res.status(403).json({ message: "Ce compte est en lecture seule" });
  }
  next();
};

// Bloque l'acces total (meme en lecture) pour un compte "viewonly". A
// placer sur les ressources qui ne font pas partie de son perimetre
// autorise (taches personnelles, recherche, liens rapides, statistiques...).
exports.denyViewOnly = (req, res, next) => {
  if (req.user.role === "viewonly") {
    return res.status(403).json({ message: "Fonctionnalite non disponible pour un compte lecture seule" });
  }
  next();
};
