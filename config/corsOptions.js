import allowedOrigins from './allowedOrigins.js';

const corsOptions = {
    origin: (origin, callback) => {
        console.log(origin)
        // !origin is set for development phase only (i.e) it is to make cors available for localhost when an origin is undefined
        if (allowedOrigins.indexOf(origin) !== -1 || !origin) { // since it is an open source project !origin is set
            callback(null, true)
        } else {
            console.log(`Origin not allowed: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200
}

export default corsOptions;