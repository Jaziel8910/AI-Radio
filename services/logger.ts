
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
}

// Este es el "cerebro" que notificará a nuestro overlay
const listeners = new Set<(entry: LogEntry) => void>();

const formatMessage = (args: any[]): string => {
    return args.map(arg => {
        if (typeof arg === 'string') return arg;
        if (arg instanceof Error) return arg.stack || arg.message;
        try {
            return JSON.stringify(arg, null, 2);
        } catch (e) {
            return String(arg);
        }
    }).join(' ');
};

const log = (level: LogLevel, ...args: any[]) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour12: false });
    const message = formatMessage(args);
    
    const entry: LogEntry = { timestamp, level, message };

    // Imprimir a la consola normal también, por si acaso
    switch(level) {
        case 'INFO': console.log(timestamp, ...args); break;
        case 'WARN': console.warn(timestamp, ...args); break;
        case 'ERROR': console.error(timestamp, ...args); break;
        case 'DEBUG': console.debug(timestamp, ...args); break;
    }

    // Notificar a nuestro overlay
    listeners.forEach(listener => listener(entry));
};

export const logger = {
    info: (...args: any[]) => log('INFO', ...args),
    warn: (...args: any[]) => log('WARN', ...args),
    error: (...args: any[]) => log('ERROR', ...args),
    debug: (...args: any[]) => log('DEBUG', ...args),
    subscribe: (callback: (entry: LogEntry) => void) => {
        listeners.add(callback);
    },
    unsubscribe: (callback: (entry: LogEntry) => void) => {
        listeners.delete(callback);
    }
};

// CAPTURADORES GLOBALES DE ERRORES - LA CLAVE MÁGICA ✨
window.addEventListener('error', (event) => {
    logger.error('UNCAUGHT ERROR:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
    logger.error('UNHANDLED PROMISE REJECTION:', event.reason);
});
