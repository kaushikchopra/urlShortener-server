// Dotenv config
import dotenv from 'dotenv';
dotenv.config();

// Express
import express from 'express';
const app = express();

import cors from 'cors';
import corsOptions from './config/corsOptions.js';
import credentials from './middlewares/credentials.js';
import { databaseConnection } from './config/db.js';
import userRoutes from "./routes/userRoutes.js";
import urlRoutes from "./routes/urlRoutes.js";
import { logger } from "./middlewares/logEvents.js";
import errorHandler from './middlewares/errorHandler.js';
import cookieParser from 'cookie-parser';

const port = process.env.PORT || 8070;

// Database Connection
databaseConnection();

// custom middleware logger
app.use(logger);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json 
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", userRoutes);
app.use("/api/url", urlRoutes);

// Make the short url to redirect to the Original Url
app.get("/:id", cors(), (req, res) => {
    const { id } = req.params;

    // Construct the redirect URL
    const redirectUrl = `/api/url/${id}`;

    // Redirect to the constructed URL
    res.redirect(redirectUrl);
});

// Handle all errors
app.use(errorHandler);

app.listen(port, () => {
    console.log(`Server is running on the port ${port}`);
})