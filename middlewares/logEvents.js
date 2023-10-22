import { format } from 'date-fns';
import { v4 as uuid } from 'uuid';

import { existsSync } from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); // Get the current module's file path.
const __dirname = path.dirname(__filename);

const logEvents = async (message, logName) => {
    const dateTime = `${format(new Date(), 'yyyyMMdd\tHH:mm:ss')}`;
    const logItem = `${dateTime}\t${uuid()}\t${message}\n`;

    try {
        if (!existsSync(path.join(__dirname, '..', 'logs'))) {
            await fsPromises.mkdir(path.join(__dirname, '..', 'logs'));
        }

        await fsPromises.appendFile(path.join(__dirname, '..', 'logs', logName), logItem);
    } catch (err) {
        console.log(`Error creating log file for ${logName}: ${err}`);
    }
}

const logger = (req, res, next) => {
    logEvents(`${req.method}\t${req.headers.origin}\t${req.url}`, 'reqLog.txt');
    console.log(`${req.method} ${req.path}`);
    next();
}

export { logger, logEvents };
