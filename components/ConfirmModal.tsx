import React from 'react';
import LoadingButton from './LoadingButton';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'danger' | 'warning' | 'info';
    isLoading?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm,
    onCancel,
    type = 'info',
    isLoading = false,
}) => {
    if (!isOpen) return null;

    const getIconAndColor = () => {
        switch (type) {
            case 'danger':
                return { icon: 'error', color: 'text-red-500', bgColor: 'bg-red-50' };
            case 'warning':
                return { icon: 'warning', color: 'text-amber-500', bgColor: 'bg-amber-50' };
            case 'info':
            default:
                return { icon: 'info', color: 'text-terracotta-500', bgColor: 'bg-terracotta-50' };
        }
    };

    const { icon, color, bgColor } = getIconAndColor();

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-terracotta-100">
                {/* Icon */}
                <div className={`w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center mb-4`}>
                    <span className={`material-symbols-outlined ${color} text-3xl fill`}>{icon}</span>
                </div>

                {/* Content */}
                <h2 className="text-2xl font-bold text-sunset-dark mb-2">{title}</h2>
                <p className="text-sunset-muted text-sm leading-relaxed mb-6">{message}</p>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 h-12 bg-warm-cream border-2 border-terracotta-100 text-sunset-dark font-bold rounded-xl active:scale-[0.98] transition-all hover:bg-terracotta-50"
                    >
                        {cancelText}
                    </button>
                    <LoadingButton
                        onClick={onConfirm}
                        isLoading={isLoading}
                        className="flex-1 h-12 bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold rounded-xl shadow-lg shadow-terracotta-500/30"
                    >
                        {confirmText}
                    </LoadingButton>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
