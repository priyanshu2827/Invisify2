/**
 * Structured JSON Logger
 * Production-ready logging with severity levels and structured metadata
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

const LOG_LEVEL_NAMES = ['DEBUG', 'INFO', 'WARN', 'ERROR'] as const;

// Configurable minimum log level from environment
const MIN_LEVEL = (() => {
    const envLevel = (process.env.LOG_LEVEL || 'INFO').toUpperCase();
    const idx = LOG_LEVEL_NAMES.indexOf(envLevel as any);
    return idx >= 0 ? idx : LogLevel.INFO;
})();

export interface LogEntry {
    timestamp: string;
    level: string;
    module: string;
    message: string;
    data?: any;
    error?: string;
    stack?: string;
}

function formatEntry(level: LogLevel, module: string, message: string, data?: any, error?: Error): LogEntry {
    const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: LOG_LEVEL_NAMES[level],
        module,
        message,
    };
    if (data !== undefined) entry.data = data;
    if (error) {
        entry.error = error.message;
        entry.stack = error.stack;
    }
    return entry;
}

export function log(level: LogLevel, module: string, message: string, data?: any) {
    if (level < MIN_LEVEL) return;

    const entry = formatEntry(level, module, message, data);
    const json = JSON.stringify(entry);

    switch (level) {
        case LogLevel.ERROR:
            console.error(json);
            break;
        case LogLevel.WARN:
            console.warn(json);
            break;
        default:
            console.log(json);
    }
}

export function logError(module: string, message: string, error: Error, data?: any) {
    if (LogLevel.ERROR < MIN_LEVEL) return;
    const entry = formatEntry(LogLevel.ERROR, module, message, data, error);
    console.error(JSON.stringify(entry));
}

// Convenience methods
export const logger = {
    debug: (module: string, message: string, data?: any) => log(LogLevel.DEBUG, module, message, data),
    info: (module: string, message: string, data?: any) => log(LogLevel.INFO, module, message, data),
    warn: (module: string, message: string, data?: any) => log(LogLevel.WARN, module, message, data),
    error: (module: string, message: string, error?: Error, data?: any) => {
        if (error) logError(module, message, error, data);
        else log(LogLevel.ERROR, module, message, data);
    },
};
