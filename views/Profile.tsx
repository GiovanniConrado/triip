
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import Toast, { ToastType } from '../components/Toast';
import ImageUpload from '../components/ImageUpload';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { profileService } from '../services/profileService';
import { storageService } from '../services/storageService';
import { DEFAULT_TRIP_IMAGE } from '../constants';

const Profile: React.FC = () => {
    const navigate = useNavigate();
    const { user: authUser, profile, refreshProfile } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [tripCount, setTripCount] = useState(0);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        bio: '',
        avatar: '',
    });

    // Load initial data from profile
    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.full_name || '',
                username: profile.username || '',
                email: authUser?.email || '',
                bio: profile.bio || 'Planejando minha próxima aventura! ✈️🌍',
                avatar: profile.avatar_url || DEFAULT_TRIP_IMAGE,
            });
        }

        // Load trip count
        const loadStats = async () => {
            try {
                const trips = await storageService.getTrips();
                setTripCount(trips.length);
            } catch (error) {
                console.error('Error loading trip count:', error);
            }
        };
        loadStats();
    }, [profile, authUser]);

    const handleSave = async () => {
        if (!authUser) return;

        setIsSaving(true);
        try {
            await profileService.updateProfile(authUser.id, {
                full_name: formData.name,
                username: formData.username,
                bio: formData.bio,
                avatar_url: formData.avatar,
            });

            // Refresh profile in context
            if (refreshProfile) {
                await refreshProfile();
            }

            setIsEditing(false);
            setToast({ message: 'Perfil atualizado com sucesso!', type: 'success' });
        } catch (error: any) {
            console.error('Error saving profile:', error);
            setToast({ message: 'Erro ao salvar perfil.', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = async () => {
        try {
            await authService.signOut();
            navigate('/welcome');
        } catch (error: any) {
            setToast({ message: 'Erro ao sair.', type: 'error' });
        }
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md px-6 pt-14 pb-4 border-b border-terracotta-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="flex items-center justify-center transition-transform active:scale-90"
                        >
                            <span className="material-symbols-outlined text-2xl text-sunset-dark">menu</span>
                        </button>
                        <h1 className="text-2xl font-black tracking-tight text-sunset-dark">Meu Perfil</h1>
                    </div>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="w-10 h-10 rounded-full bg-white border border-terracotta-100 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-sunset-dark">
                            {isEditing ? 'close' : 'edit'}
                        </span>
                    </button>
                </div>
            </header>

            <main className="flex-1 px-6 py-6 space-y-6">
                {/* Avatar & Name */}
                <div className="bg-white rounded-3xl p-6 border border-terracotta-100 shadow-sm text-center">
                    {isEditing ? (
                        <div className="mb-4 flex justify-center">
                            <ImageUpload
                                currentImage={formData.avatar}
                                onImageChange={(url) => {
                                    setFormData({ ...formData, avatar: url });
                                }}
                                folder="profiles"
                                aspectRatio={1}
                                cropShape="round"
                                placeholder="Foto de Perfil"
                                className="w-32 h-32"
                            />
                        </div>
                    ) : (
                        <div className="relative inline-block mb-4">
                            <img
                                src={formData.avatar}
                                alt={formData.name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                            />
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Seu nome"
                                className="w-full text-center text-xl font-bold text-sunset-dark bg-warm-cream border border-terracotta-100 rounded-xl px-4 py-2"
                            />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                placeholder="@username"
                                className="w-full text-center text-sm text-sunset-muted bg-warm-cream border border-terracotta-100 rounded-xl px-4 py-2"
                            />
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="w-full h-12 bg-terracotta-500 text-white font-bold rounded-xl shadow-lg shadow-terracotta-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">check</span>
                                        Salvar Alterações
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-xl font-bold text-sunset-dark mb-1">{formData.name || 'Viajante'}</h2>
                            <p className="text-sm text-sunset-muted">@{formData.username || 'usuario'}</p>
                        </>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-terracotta-100">
                        <div>
                            <p className="text-2xl font-black text-terracotta-600">{tripCount}</p>
                            <p className="text-[10px] text-sunset-muted uppercase tracking-wider">Viagens</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-terracotta-600">0</p>
                            <p className="text-[10px] text-sunset-muted uppercase tracking-wider">Amigos</p>
                        </div>
                        <div>
                            <p className="text-2xl font-black text-terracotta-600">0</p>
                            <p className="text-[10px] text-sunset-muted uppercase tracking-wider">Países</p>
                        </div>
                    </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-sunset-muted mb-3 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">contact_mail</span>
                        Informações de Contato
                    </h3>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-terracotta-50 rounded-xl flex items-center justify-center">
                                <span className="material-symbols-outlined text-terracotta-500">mail</span>
                            </div>
                            <p className="text-sm text-sunset-dark flex-1 truncate">{formData.email}</p>
                        </div>
                    </div>
                </div>

                {/* Logout Button */}
                <button
                    onClick={handleLogout}
                    className="w-full h-14 bg-white border border-red-100 text-red-500 font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                    <span className="material-symbols-outlined">logout</span>
                    Sair da Conta
                </button>

                {/* Quick Actions */}
                <div className="space-y-2">
                    <button
                        onClick={() => navigate('/friends')}
                        className="w-full flex items-center gap-4 p-4 bg-white border border-terracotta-100 rounded-2xl shadow-sm active:scale-[0.99] transition-all opacity-50 cursor-not-allowed"
                        disabled
                    >
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-blue-600">group</span>
                        </div>
                        <div className="flex-1 text-left">
                            <p className="font-bold text-sunset-dark">Meus Amigos</p>
                            <p className="text-[10px] text-sunset-muted">Em breve</p>
                        </div>
                        <span className="material-symbols-outlined text-terracotta-300">chevron_right</span>
                    </button>
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default Profile;
