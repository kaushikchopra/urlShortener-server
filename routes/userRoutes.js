import express from "express";
import { accountActivate, resendActivationLink, login, signup, forgotPassword, resetPassword, getUserData, handleRefreshToken, handleLogout } from "../controllers/userControllers.js";
import { isAuthenticated } from "../middlewares/authMiddlewares.js";

const router = express.Router();

// Signup route
router.post("/signup", signup);

// Account Activation route
router.patch("/activation/:token", accountActivate);

// Resend Activation Link route
router.get("/resend-activation/:email", resendActivationLink)

// Login route
router.post("/login", login);

// Forgot Password route
router.post("/forgot-password", forgotPassword);

// Reset Password route
router.patch("/reset-password/:token", resetPassword);

// Refresh Token route
router.get("/refresh", handleRefreshToken);

// User Data fetch
router.get('/user', isAuthenticated, getUserData);

// Logout route
router.get("/logout", handleLogout);

export default router;