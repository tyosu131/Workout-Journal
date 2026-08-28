const { verifyToken } = require("../utils/authUtils");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  const user = await verifyToken(token);
  if (!user || !user.id) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.user = user;
  return next();
};

module.exports = authenticate;
