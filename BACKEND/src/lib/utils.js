import jwt from "jsonwebtoken";

// Generate a JWT and set it as an HTTP-only cookie.
// When the frontend is served from a different origin (production + FRONTEND_URL set)
// we must set sameSite='none' and secure=true so browsers send the cookie cross-site.
export const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d",
    });

    // Decide cookie security policy
    const isDev = process.env.NODE_ENV === "development";
    const crossSiteCookies = !isDev && !!process.env.FRONTEND_URL;

    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: crossSiteCookies ? "none" : "strict",
        secure: crossSiteCookies || !isDev,
    });

    return token;
};