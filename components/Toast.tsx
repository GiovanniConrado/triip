import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
    duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const getColors = () => {
        switch (type) {
            case 'success':
                return { text: 'text-emerald-600', icon: 'check_circle', bg: 'bg-emerald-50/80', border: 'border-emerald-100' };
            case 'error':
                return { text: 'text-red-500', icon: 'error', bg: 'bg-red-50/80', border: 'border-red-100' };
            case 'warning':
                return { text: 'text-amber-600', icon: 'warning', bg: 'bg-amber-50/80', border: 'border-amber-100' };
            case 'info':
            default:
                return { text: 'text-terracotta-600', icon: 'info', bg: 'bg-terracotta-50/80', border: 'border-terracotta-100' };
        }
    };

    const colors = getColors();

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-48px)] max-w-[400px] animate-snackbar-up">
            <div className={`
                ${colors.bg} ${colors.border} ${colors.text}
                backdrop-blur-xl border shadow-xl rounded-2xl p-4 
                flex items-center gap-3 ring-1 ring-black/5
            `}>
                <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/50 flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined fill text-2xl">{colors.icon}</span>
                </div>
                <p className="flex-1 font-bold text-sm tracking-tight leading-tight">{message}</p>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 transition-colors active:scale-90"
                >
                    <span className="material-symbols-outlined text-lg opacity-50">close</span>
                </button>
            </div>
        </div>
    );
};

export default Toast;
