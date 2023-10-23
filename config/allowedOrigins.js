const allowedOrigins = [
    'https://urlsht.netlify.app',
    'https://short-url-prbk.onrender.com',
];

export default allowedOrigins;


// function matchOrigin(origin, allowedOrigins) {
//     return allowedOrigins.some(allowedOrigin => {
//         if (allowedOrigin.endsWith('/*')) {
//             // Check if the allowed origin is a wildcard
//             const baseOrigin = allowedOrigin.slice(0, -2);
//             return origin.startsWith(baseOrigin);
//         } else {
//             return origin === allowedOrigin;
//         }
//     });
// }

// // Example of how to use the matchOrigin function
// const originToCheck = 'https://short-url-prbk.onrender.com/some/path';
// if (matchOrigin(originToCheck, allowedOrigins)) {
//     console.log('Allowed by CORS');
// } else {
//     console.log('Not allowed by CORS');
// }