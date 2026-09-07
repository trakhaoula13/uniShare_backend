const { validationResult } = require("express-validator");

// A placer apres les chaines de validation express-validator sur une route.
// Renvoie la premiere erreur trouvee au format {message} deja utilise
// partout ailleurs dans l'API, pour rester coherent cote frontend.
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }
  next();
};

module.exports = { validate };
