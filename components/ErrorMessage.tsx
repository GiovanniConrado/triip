
import React from 'react';

interface ErrorMessageProps {
    message?: string;
    onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
    message = 'Algo deu errado. Tente novamente.',
    onRetry
}) => {
    return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 text-center px-6">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-4xl">error</span>
            </div>
            <div className="space-y-2">
                <h3 className="font-bold text-sunset-dark">Ops!</h3>
                <p className="text-sunset-muted text-sm max-w-xs">{message}</p>
            </div>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-2.5 bg-terracotta-500 text-white font-semibold rounded-xl hover:bg-terracotta-600 active:scale-95 transition-all"
                >
                    Tentar Novamente
                </button>
            )}
        </div>
    );
};

export default ErrorMessage;
