import { BASE_URL, DAILY_LIMIT, MONTHLY_LIMIT } from "../config/config.js";
import { Url } from "../models/URLShortener.js";
import validUrl from "valid-url";
import { nanoid } from "nanoid";
import { User } from "../models/User.js"

// Shortening an original URL
const shortenUrl = async (req, res) => {
    const { origUrl } = req.body;

    // Validate the original URL
    if (!validUrl.isUri(origUrl)) {
        return res.status(400).json({ error: "Invalid URL" });
    }

    try {
        const userId = req.user.userId;
        const currentDate = new Date();
        const urlId = nanoid(8); // Generate a unique short URL key

        // Find the user document and update the daily and monthly counts
        const user = await User.findOne({ _id: userId }).exec();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const today = currentDate.toLocaleDateString();
        const thisMonth = (currentDate.getMonth() + 1).toString();

        // Ensure the specific day and month properties exist and are initialized as numbers
        if (!user.dailyUrlCounts) {
            user.dailyUrlCounts = new Map();
        }

        if (!user.monthlyUrlCounts) {
            user.monthlyUrlCounts = new Map();
        }


        if (!user.dailyUrlCounts.has(today)) {
            user.dailyUrlCounts.set(today, 0);
        }

        if (!user.monthlyUrlCounts.has(thisMonth)) {
            user.monthlyUrlCounts.set(thisMonth, 0);
        }

        // Update the counts
        user.dailyUrlCounts.set(today, user.dailyUrlCounts.get(today) + 1);
        user.monthlyUrlCounts.set(thisMonth, user.monthlyUrlCounts.get(thisMonth) + 1);

        // Check if the user has reached the daily or monthly limit
        if (user.dailyUrlCounts.get(today) > DAILY_LIMIT) {
            return res.status(400).json({ error: "Daily limit exceeded" });
        }

        if (user.monthlyUrlCounts.get(thisMonth) > MONTHLY_LIMIT) {
            return res.status(400).json({ error: "Monthly limit exceeded" });
        }

        // Check if the URL already exists in the database
        const existingUrl = await Url.findOne({ origUrl, user: req.user.userId }).exec();

        if (existingUrl) {
            return res.status(200).json(existingUrl);
        }


        // Create a new short URL entry and save it
        const shortUrl = `${BASE_URL}/${urlId}`;

        const url = new Url({
            user: req.user.userId,
            origUrl,
            shortUrl,
            urlId,
        });

        // Save the new short URL
        await url.save();

        // Update the user document
        await user.save();

        res.status(201).json({ url });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Server error" });
    }
};

// Redirect to the original URL associated with the short URL
const redirectToOriginalUrl = async (req, res) => {
    const { id } = req.params;

    try {
        // Find the short URL entry in the database
        const url = await Url.findOne({ urlId: id }).exec();

        if (!url) {
            return res.status(404).json({ error: "URL not found" });
        }

        // Increment the visit count (if needed)
        await Url.updateOne({ _id: url._id }, { $inc: { count: 1 } });

        // Redirect to the original URL
        res.redirect(url.origUrl);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
};

// Dashboard to show daily and monthly url updates
const dashboard = async (req, res) => {
    try {
        // Get the user ID from the request
        const userId = req.user.userId;

        // Find the user in the database by their ID
        const user = await User.findOne({ _id: userId }).exec();

        // Check if the user exists
        if (!user) {
            return res.status(401).json({ error: "User not found" });
        }

        // Destructure the user object to get the required fields
        const { firstName, lastName, username, dailyUrlCounts, monthlyUrlCounts } = user;

        // Send the response with the required data
        res.status(200).json({ firstName, lastName, username, dailyUrlCounts, monthlyUrlCounts });

    } catch (error) {
        // Handle errors and send an error response
        console.log("Dashboard Error: ", error.message);
        res.status(500).send("Internal Server Error");
    }
}

// Display all URL Shortened Data
const showAllUrls = async (req, res) => {
    try {
        // Find all the URLs of the user
        const urls = await Url.find({ user: req.user.userId });

        // Create an array to store the URL data
        const urlData = urls.map((url) => {
            return {
                origUrl: url.origUrl,
                shortUrl: url.shortUrl,
                count: url.count,
            };
        });

        res.status(200).json(urlData);

    } catch (error) {
        // Handle errors and send an error response
        console.log("Show all URLs Error: ", error.message);
        res.status(500).send("Internal Server Error");
    }
}

export { shortenUrl, redirectToOriginalUrl, dashboard, showAllUrls };


