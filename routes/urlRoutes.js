import express from "express";
import { isAuthenticated } from "../middlewares/authMiddlewares.js";
import { shortenUrl, redirectToOriginalUrl, dashboard, showAllUrls } from "../controllers/urlControllers.js"

const router = express.Router();

// URL Shortening route
router.post("/short-url", isAuthenticated, shortenUrl);

// Dashboard route
router.get("/dashboard", isAuthenticated, dashboard);

// Display URL Data route
router.get("/created-url", isAuthenticated, showAllUrls);

// Redirecting to Original URL route
router.get("/:id", redirectToOriginalUrl)


export default router;