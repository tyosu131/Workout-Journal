const { verifyToken } = require("../utils/authUtils");

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log("Authorization header provided:", false);
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log("Authorization token provided:", Boolean(token));
  console.log("JWT_SECRET configured:", Boolean(process.env.JWT_SECRET));

  const user = await verifyToken(token);
  if (!user || !user.id) {
    return res.status(401).json({ error: "Invalid token" });
  }

  console.log("Authenticated user:", { id: user.id });
  req.user = user;
  return next();
};

module.exports = authenticate;
