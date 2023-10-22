import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true,
    },
    lastName: {
        type: String,
        required: true,
        trim: true,
    },
    username: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    password: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    isActivated: {
        type: Boolean,
        default: false
    },
    activateToken: {
        type: String,
    },
    refreshToken: {
        type: String,
    },
    resetToken: {
        type: String,
    },
    dailyUrlCounts: {
        type: Map,
        of: Number,
        default: {},
    },
    monthlyUrlCounts: {
        type: Map,
        of: Number,
        default: {},
    },
});

userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    return obj;
}

// Create a unique index on the 'username' field
userSchema.index({ username: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export { User };