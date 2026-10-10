// backend/config/checkEnv.js  (nouveau fichier)
// Verifie au demarrage que les variables du stockage de fichiers existent.
// Affiche un message clair dans les logs de Render au lieu d'une erreur
// obscure lors du premier envoi de fichier. Ne bloque pas le serveur.
const STORAGE_VARS = ["S3_ENDPOINT", "S3_REGION", "S3_BUCKET", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];

module.exports = function checkStorageEnv() {
  const missing = STORAGE_VARS.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.warn(
      `[stockage] Variables manquantes : ${missing.join(", ")}. ` +
        "L'envoi de fichiers sera refuse tant qu'elles ne sont pas definies (Render > Environment)."
    );
  } else {
    console.log(`[stockage] Backblaze/S3 configure (bucket : ${process.env.S3_BUCKET})`);
  }
};
