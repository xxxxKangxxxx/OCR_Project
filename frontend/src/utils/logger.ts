import axios from 'axios';

interface LogMetadata {
    [key: string]: any;
}

class Logger {
    private static instance: Logger;
    private debugMode: boolean;
    private logElement: HTMLElement | null = null;
    private readonly API_URL = 'http://localhost:8000/api/log';

    private constructor() {
        this.debugMode = process.env.NODE_ENV === 'development';
        this.initializeLogElement();
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    private initializeLogElement() {
        if (typeof document !== 'undefined' && this.debugMode) {
            this.logElement = document.getElementById('debug-log');
            if (!this.logElement) {
                this.logElement = document.createElement('div');
                this.logElement.id = 'debug-log';
                this.logElement.style.cssText = `
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    max-height: 200px;
                    overflow-y: auto;
                    background: rgba(0, 0, 0, 0.8);
                    color: white;
                    font-family: monospace;
                    font-size: 12px;
                    padding: 10px;
                    z-index: 9999;
                    display: none;
                `;
                document.body.appendChild(this.logElement);
            }
        }
    }

    public toggleDebugView() {
        if (this.logElement) {
            this.logElement.style.display = 
                this.logElement.style.display === 'none' ? 'block' : 'none';
        }
    }

    private async sendToServer(message: string, level: string, metadata: LogMetadata = {}) {
        try {
            await axios.post(this.API_URL, {
                message,
                level,
                metadata: {
                    ...metadata,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                }
            });
        } catch (error) {
            console.error('Failed to send log to server:', error);
        }
    }

    private appendToDebugView(message: string, level: string) {
        if (this.debugMode && this.logElement) {
            const timestamp = new Date().toLocaleTimeString();
            const logEntry = document.createElement('div');
            logEntry.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
            logEntry.style.padding = '4px 0';
            
            let emoji = '📝';
            switch (level) {
                case 'error': emoji = '❌'; break;
                case 'warn': emoji = '⚠️'; break;
                case 'info': emoji = 'ℹ️'; break;
                case 'success': emoji = '✅'; break;
            }
            
            logEntry.textContent = `${emoji} [${timestamp}] ${message}`;
            this.logElement.appendChild(logEntry);
            this.logElement.scrollTop = this.logElement.scrollHeight;
        }
    }

    public async info(message: string, metadata: LogMetadata = {}) {
        console.info(message);
        this.appendToDebugView(message, 'info');
        await this.sendToServer(message, 'info', metadata);
    }

    public async error(message: string, metadata: LogMetadata = {}) {
        console.error(message);
        this.appendToDebugView(message, 'error');
        await this.sendToServer(message, 'error', metadata);
    }

    public async warn(message: string, metadata: LogMetadata = {}) {
        console.warn(message);
        this.appendToDebugView(message, 'warn');
        await this.sendToServer(message, 'warn', metadata);
    }

    public async success(message: string, metadata: LogMetadata = {}) {
        console.log('%c' + message, 'color: green');
        this.appendToDebugView(message, 'success');
        await this.sendToServer(message, 'success', metadata);
    }
}

export const logger = Logger.getInstance(); 