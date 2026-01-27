import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';
import Toast, { ToastType } from '../components/Toast';

const CompleteProfile: React.FC = () => {
    const navigate = useNavigate();
    const { user, refreshProfile, signOut } = useAuth();
    const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!fullName.trim() || !username.trim()) {
            setToast({ message: 'Nome e username são obrigatórios.', type: 'error' });
            return;
        }

        const cleanUsername = username.replace('@', '').trim().toLowerCase();

        setIsSubmitting(true);
        try {
            const isAvailable = await profileService.checkUsernameAvailable(cleanUsername, user.id);
            if (!isAvailable) {
                setToast({ message: 'Username já está em uso.', type: 'error' });
                return;
            }

            await profileService.createProfile({
                id: user.id,
                full_name: fullName,
                username: cleanUsername,
                bio,
                avatar_url: user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`,
                updated_at: new Date().toISOString(),
            });

            await refreshProfile();
            navigate('/dashboard');
        } catch (error: any) {
            setToast({ message: error.message || 'Erro ao salvar perfil.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="px-8 pt-16 pb-6 text-center">
                <h1 className="text-3xl font-serif text-sunset-dark mb-2">Quase lá!</h1>
                <p className="text-sunset-muted text-sm">Complete seu perfil para começar a viajar.</p>
            </header>

            <main className="flex-1 px-8 pb-12">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-white rounded-3xl p-6 border border-terracotta-100 shadow-sm space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-sunset-muted mb-2 px-1">Nome Completo</label>
                            <input
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark"
                                placeholder="Seu nome"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-sunset-muted mb-2 px-1">Username</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted font-bold">@</span>
                                <input
                                    className="w-full h-12 pl-10 pr-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark"
                                    placeholder="seu_username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-widest text-sunset-muted mb-2 px-1">Bio (Opcional)</label>
                            <textarea
                                className="w-full px-4 py-3 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark resize-none"
                                placeholder="Conte um pouco sobre suas viagens..."
                                rows={3}
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Salvando...' : 'Concluir Perfil'}
                    </button>

                    <div className="pt-4 text-center">
                        <button
                            type="button"
                            onClick={() => signOut()}
                            className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors flex items-center justify-center gap-2 mx-auto"
                        >
                            <span className="material-symbols-outlined text-lg">logout</span>
                            Sair e tentar novamente
                        </button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default CompleteProfile;
