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

    const getTypeStyles = () => {
        switch (type) {
            case 'success':
                return 'bg-emerald-500 border-emerald-600';
            case 'error':
                return 'bg-red-500 border-red-600';
            case 'warning':
                return 'bg-amber-500 border-amber-600';
            case 'info':
            default:
                return 'bg-terracotta-500 border-terracotta-600';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return 'check_circle';
            case 'error':
                return 'error';
            case 'warning':
                return 'warning';
            case 'info':
            default:
                return 'info';
        }
    };

    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-[90%] w-full sm:max-w-md animate-slide-down">
            <div className={`${getTypeStyles()} text-white rounded-2xl shadow-2xl border-2 p-4 flex items-center gap-3 backdrop-blur-xl`}>
                <span className="material-symbols-outlined fill text-2xl">{getIcon()}</span>
                <p className="flex-1 font-medium text-sm">{message}</p>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors active:scale-95"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        </div>
    );
};

export default Toast;
