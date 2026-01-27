
import React from 'react';
import { supabase } from '../services/supabaseClient';

interface LoadingProps {
    message?: string;
}

const Loading: React.FC<LoadingProps> = ({ message = 'Carregando...' }) => {
    const handleEmergencyExit = async () => {
        await supabase.auth.signOut();
        window.location.href = '/#/welcome';
        window.location.reload();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-20 space-y-6">
            <div className="w-12 h-12 border-4 border-terracotta-200 border-t-terracotta-500 rounded-full animate-spin"></div>
            <div className="text-center space-y-2">
                <p className="text-sunset-muted text-sm font-medium">{message}</p>
                <div className="pt-8">
                    <button
                        onClick={handleEmergencyExit}
                        className="text-[10px] font-bold text-terracotta-400 uppercase tracking-widest hover:text-terracotta-600 transition-colors underline underline-offset-4"
                    >
                        Demorando muito? Clique aqui para reiniciar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Loading;
