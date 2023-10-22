import jwt from 'jsonwebtoken';

// Middleware for verifying JWT tokens
const isAuthenticated = (req, res, next) => {
    const authHeader = req.headers["authorization"] || req.headers["Authorization"];

    if (!authHeader?.startsWith('Bearer ')) return res.sendStatus(401); // Unauthorized

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        console.error('Token verification error:', err);
        return res.status(403).json({ error: "Invalid token" });
    }

};

export { isAuthenticated };
