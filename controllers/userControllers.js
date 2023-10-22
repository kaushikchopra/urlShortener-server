import { User } from "../models/User.js";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import { clientURL } from "../config/config.js";

// Signup
const signup = async (req, res) => {
    try {
        // Check if user already exists
        const { firstName, lastName, username, password } = req.body;

        const user = await User.findOne({ username }).exec();
        if (user) {
            return res.status(409).json({ error: "Email already in use" });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create the new user document in MongoDB
        const newUser = await User.create({
            firstName,
            lastName,
            username,
            password: hashedPassword
        });

        // Generate an activation token
        const activationData = {
            user: newUser._id,
        }

        const activationToken = jwt.sign(activationData, process.env.ACTIVATION_TOKEN_SECRET, { expiresIn: "1h" });

        // Save the activation token
        newUser.activateToken = activationToken;
        await newUser.save();

        // Nodemailer configuration to send mails using gmail
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                ciphers: "SSLv3"
            }
        })

        // Compose an email to send an user activation link
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: username,
            subject: "User Account Activation Request",
            html: `
                <p>This email is to verify your email account.</p>
                <p>Please click on the following button to activate your account.</p>
                <a href=${clientURL}/activation/${activationToken} style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Activate Account</a>`
        }

        // Send the email using the created transporter
        const mailSentResponse = await transporter.sendMail(mailOptions);

        if (mailSentResponse) {
            return res.status(200).json({
                status: `Verification link has been sent to your email ${username}`,
                activationToken
            });
        } else {
            return res.status(400).json({
                error: "Error sending account activation email"
            });
        }

    } catch (error) {
        console.log("Signup Error: ", error.message);
        res.status(500).send("Internal Server Error");
    }
}

// Account Activation
const accountActivate = async (req, res) => {
    try {
        const { token } = req.params;
        const decodedToken = jwt.verify(token, process.env.ACTIVATION_TOKEN_SECRET);

        if (!decodedToken) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const user = await User.findById(decodedToken.user);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.isActivated) {
            return res.status(400).json({ message: 'User is already activated' });
        }

        // Update the user's activation status and clear the activation token
        user.isActivated = true;
        user.activateToken = null;
        await user.save();

        return res.json({ message: 'Account activated successfully' });
    } catch (error) {
        console.error(`Internal error: ${error}`);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// Resend Activation Link
const resendActivationLink = async (req, res) => {
    try {
        const { email } = req.params;

        // Find the user by email
        const user = await User.findOne({ username: email }).exec();

        if (!user) {
            return res.status(404).json({ error: "User not found. Please sign up." });
        }

        // Check if account has already been activated
        if (user.isActivated) {
            return res.status(200).json({ status: "Account is already activated." });
        }

        // Generate a new activation token
        const newActivationToken = jwt.sign({ userId: user._id }, process.env.ACTIVATION_TOKEN_SECRET, { expiresIn: "1h" });

        // Update the user's activateToken
        user.activateToken = newActivationToken;
        await user.save();

        // Send a new activation email with the updated token.
        // Nodemailer configuration to send mails using gmail
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                ciphers: "SSLv3"
            }
        })

        // Compose an email to send an user activation link
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "User Account Activation Request",
            html: `
                <p>This email is to verify your email account.</p>
                <p>Please click on the following button to activate your account.</p>
                <a href=${clientURL}/activation/${newActivationToken} style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Activate Account</a>`
        }

        // Send the email using the created transporter
        const mailSentResponse = await transporter.sendMail(mailOptions);

        if (mailSentResponse) {
            return res.status(200).json({
                status: `A new activation link has been sent to your email ${email}`,
                newActivationToken
            });
        } else {
            return res.status(400).json({
                error: "Error sending account activation email"
            });
        }

    } catch (error) {
        console.error("Resend Activation Link Error: ", error);
        res.status(500).send("Internal Server Error");
    }
};

// Login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password are required.' });

        // Check if the user already exists
        const user = await User.findOne({ username }).exec();

        // User does not exists
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Compare the password with hashed password
        const passwordCompare = await bcrypt.compare(password, user.password)

        if (passwordCompare) {
            // Check if the User account is activated 
            if (!user.isActivated) {
                return res.status(400).json({ error: "Please activate your account before login" });
            }

            // Generate a login access token
            const expireInMinutes = Math.floor(Date.now() / 1000) + (15 * 60); //15 minutes

            const accessToken = jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: expireInMinutes })

            const refreshToken = jwt.sign({ userId: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1d" })

            user.refreshToken = refreshToken;
            await user.save(); // Update the refresh token in the Database

            // Creates Secure Cookie with refresh token
            res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: "None", maxAge: 24 * 60 * 60 * 1000 })

            // Send access token to user
            res.json({ status: "User logged in successfully!", accessToken });
        } else {
            return res.status(400).json({ error: "Invalid credentials" }); // Password does not match
        }

    } catch (error) {
        console.log("Login Error: ", error.message);
        res.status(500).send("Internal Server Error");
    }
}

// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body; // Get Email Id of the user

        // Check if the user already exists
        const user = await User.findOne({ username: email }).exec();

        if (!user) {
            return res.status(401).json({ error: "Email ID does not exist" });
        }

        // Generate a password reset token with an expiration time
        const data = {
            userId: user._id,
        };
        const token = jwt.sign(
            data,
            process.env.RESET_PASSWORD_SECRET,
            { expiresIn: "1h" } // Token expires in 1 hour
        );

        user.resetToken = token; // Update the resetToken field
        await user.save();

        //Nodemailer configuration to send mails using gmail
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            },
            tls: {
                ciphers: "SSLv3"
            }
        });

        // Compose an email to reset the password
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Password Reset Request",
            html: `
                <p>You are receiving this email because you (or someone else) has requested a password reset for your account.</p>
                <p>Please click on the following button to reset your password.</p>
                <a href=${clientURL}/reset-password/${token} style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #fff; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>If you did not request this, please ignore this mail, and your password will remain unchanged.</p>`
        };

        // Send the email using the created transporter
        const mailSentResponse = await transporter.sendMail(mailOptions);

        if (mailSentResponse) {
            return res.status(200).json({
                status: "Password reset email sent"
            });
        } else {
            return res.status(400).json({
                error: "Error sending password reset email"
            });
        }

    } catch (error) {
        console.error("Forgot Password Error: ", error.message);
        res.status(500).send("Internal Server Error");
    }
};


// Reset Password
const resetPassword = async (req, res) => {

    try {
        const { token } = req.params;
        const { newPassword, confirmPassword } = req.body;

        // Find the password reset token
        const passwordResetToken = await User.findOne({ resetToken: token }).exec();

        if (!passwordResetToken) {
            return res.status(401).json({ error: "Invalid or expired Token" })
        }

        // Check if the token is valid
        const tokenData = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);

        if (!tokenData) {
            return res.status(401).json({ error: "Invalid or expired Token" })
        }

        // Find the user associated with the token
        const user = await User.findById(tokenData.userId);

        if (!user) {
            return res.status(404).json({ error: "User not found" })
        }

        //Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        //Update the user's password
        user.password = hashedPassword;
        await user.save();

        // Delete the password reset token
        await User.findOneAndDelete({ resetToken: token });

        res.json({ status: "Password reset successfully" });

    } catch (error) {
        console.log("Reset Password Error: ", error.message);
        res.status(500).send("Internal Server Error");
    }
}

// Get user data for the currently logged-in user
const getUserData = async (req, res) => {
    try {
        // console.log("isAuthenticated userId: ", req.user.userId)
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userData = {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            dailyUrlCounts: user.dailyUrlCounts,
            monthlyUrlCounts: user.monthlyUrlCounts,
        };

        res.status(200).json(userData);
    } catch (error) {
        console.error('Get user data error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Handle refresh token to fetch a new access token
const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;

    // Check if refresh token is present
    if (!cookies?.refreshToken) return res.sendStatus(401); // Unauthorized

    const refreshToken = cookies.refreshToken;

    // Check if the user based on the refresh token is available
    const user = await User.findOne({ refreshToken }).exec();

    if (!user) { return res.sendStatus(403); } // Forbidden

    // Evaluate the token and provide a new access token
    jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        (error, decoded) => {
            if (error || user._id.toString() !== decoded.userId) {
                return res.sendStatus(403)
            }; // Forbidden

            const accessToken = jwt.sign(
                { userId: decoded.userId },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: Math.floor(Date.now() / 1000) + (15 * 60) } // Expires in 15 minutes
            );
            res.json({ accessToken });
        }
    )

}

// Handle Logout
const handleLogout = async (req, res) => {

    // Check if refresh token is available in the cookies
    const cookies = req.cookies;

    if (!cookies?.refreshToken) return res.sendStatus(204); // No Content
    const refreshToken = cookies.refreshToken;

    // Check if the refresh token is also in Database
    const user = await User.findOne({ refreshToken }).exec();
    if (!user) {
        res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "None" });
        return res.sendStatus(204);
    } // Clear the refresh token from cookies when the user is not found.

    // Delete refresh token in Database
    user.refreshToken = "";
    await user.save();

    // Delete refresh token from cookies;
    res.clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: "None" });
    res.sendStatus(204);
}

export { signup, accountActivate, resendActivationLink, login, forgotPassword, resetPassword, getUserData, handleRefreshToken, handleLogout }