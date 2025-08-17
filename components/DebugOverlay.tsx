
import React, { useState, useEffect, useRef } from 'react';
import { logger, LogEntry } from '../services/logger';
import { X, Trash2, AlertTriangle, Info, Bug } from 'lucide-react';

const levelConfig = {
    ERROR: { color: 'text-red-400', icon: <AlertTriangle size={14} /> },
    WARN: { color: 'text-yellow-400', icon: <AlertTriangle size={14} /> },
    INFO: { color: 'text-sky-400', icon: <Info size={14} /> },
    DEBUG: { color: 'text-purple-400', icon: <Bug size={14} /> },
};

const DebugOverlay: React.FC = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleLog = (entry: LogEntry) => {
            setLogs(prev => [entry, ...prev].slice(0, 200)); // Guardar los últimos 200 logs
        };
        logger.subscribe(handleLog);

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                setIsVisible(v => !v);
            }
        };
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            logger.unsubscribe(handleLog);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [logs]);

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 w-[90vw] max-w-[700px] h-[50vh] max-h-[500px] bg-slate-900/80 backdrop-blur-md border border-purple-500 rounded-lg shadow-2xl z-[9999] flex flex-col text-white font-mono text-xs animate-[fade-in_0.2s]">
            <div className="flex justify-between items-center p-2 bg-slate-800 border-b border-purple-500/50 flex-shrink-0">
                <h3 className="font-bold text-sm">AI Radio Debug Console</h3>
                <div className='flex gap-2'>
                    <button onClick={() => setLogs([])} className="p-1 hover:bg-slate-700 rounded" title="Limpiar logs"><Trash2 size={16} /></button>
                    <button onClick={() => setIsVisible(false)} className="p-1 hover:bg-slate-700 rounded" title="Cerrar consola"><X size={16} /></button>
                </div>
            </div>
            <div ref={logContainerRef} className="flex-grow overflow-y-auto p-2">
                {logs.map((log, i) => {
                    const config = levelConfig[log.level];
                    return (
                        <div key={i} className={`flex gap-2 items-start border-b border-slate-800 py-1 ${config.color}`}>
                            <span className="flex-shrink-0 flex items-center gap-1.5 pt-0.5">{config.icon} {log.timestamp}</span>
                            <p className="whitespace-pre-wrap break-words flex-grow">{log.message}</p>
                        </div>
                    );
                })}
            </div>
            <div className="p-1 bg-slate-800 border-t border-purple-500/50 text-center text-slate-400 flex-shrink-0">
                Presiona Ctrl + Shift + D para mostrar/ocultar.
            </div>
        </div>
    );
};

export default DebugOverlay;
