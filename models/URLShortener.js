import mongoose from "mongoose";

const shortUrlSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    origUrl: {
        type: String,
        unique: true,
        required: true,
        trim: true,
    },
    shortUrl: {
        type: String,
        unique: true,
    },
    urlId: String,
    count: {
        type: Number,
        default: 0,
    },
});

const Url = mongoose.model("Url", shortUrlSchema);

export { Url };