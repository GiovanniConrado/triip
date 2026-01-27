import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authService } from '../services/authService';
import { storageService } from '../services/storageService';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [tripCount, setTripCount] = useState(0);
    const [friendCount, setFriendCount] = useState(0);

    const userName = profile?.full_name || 'Viajante';
    const userHandle = profile?.username ? `@${profile.username}` : '';
    const userAvatar = profile?.avatar_url || 'https://ui-avatars.com/api/?background=random';

    // Fetch counts when sidebar opens
    useEffect(() => {
        if (isOpen) {
            const loadCounts = async () => {
                try {
                    const trips = await storageService.getTrips();
                    setTripCount(trips.length);
                    // Friends count will be implemented when friends feature is ready
                    setFriendCount(0);
                } catch (error) {
                    console.error('Error loading sidebar counts:', error);
                }
            };
            loadCounts();
        }
    }, [isOpen]);

    return (
        <>
            {/* Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[60] backdrop-blur-[2px] transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 w-[280px] bg-warm-cream z-[70] shadow-2xl flex flex-col border-r border-terracotta-100/50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="px-6 pt-16 pb-8">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-md ring-1 ring-terracotta-100 mb-4">
                        <img alt="Perfil" className="w-full h-full object-cover" src={userAvatar} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-sunset-dark">{userName}</h2>
                        <p className="text-sunset-muted text-sm italic">{userHandle}</p>
                    </div>
                    <div className="flex gap-4 mt-4">
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-sunset-dark">{tripCount}</span>
                            <span className="text-sunset-muted text-xs">{tripCount === 1 ? 'Viagem' : 'Viagens'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="font-bold text-sm text-sunset-dark">{friendCount}</span>
                            <span className="text-sunset-muted text-xs">{friendCount === 1 ? 'Amigo' : 'Amigos'}</span>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 px-4 py-2 overflow-y-auto no-scrollbar">
                    <div className="space-y-1">
                        <button
                            onClick={() => { navigate('/dashboard'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">home</span>
                            <span className="font-medium text-sunset-dark">Início</span>
                        </button>
                        <button
                            onClick={() => { navigate('/trips'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">grid_view</span>
                            <span className="font-medium text-sunset-dark">Minhas Viagens</span>
                        </button>
                        <button
                            onClick={() => { navigate('/finance'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500 font-bold">payments</span>
                            <span className="font-medium text-sunset-dark">Minhas Contas</span>
                        </button>
                        <button
                            onClick={() => { navigate('/holidays'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">event</span>
                            <span className="font-medium text-sunset-dark">Feriados</span>
                        </button>
                        <div className="my-2 border-t border-terracotta-100/50 mx-4"></div>
                        <button
                            onClick={() => { navigate('/profile'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">person</span>
                            <span className="font-medium text-sunset-dark">Meu Perfil</span>
                        </button>
                        <button
                            onClick={() => { navigate('/friends'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">group</span>
                            <span className="font-medium text-sunset-dark">Amigos</span>
                        </button>
                        <button
                            onClick={() => { navigate('/notifications'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">notifications</span>
                            <span className="font-medium text-sunset-dark">Notificações</span>
                        </button>
                        <button className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-terracotta-50/50 border border-terracotta-100 group">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-terracotta-500 fill">workspace_premium</span>
                                <span className="font-bold text-terracotta-600">Meus Planos</span>
                            </div>
                            <span className="bg-terracotta-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Premium</span>
                        </button>

                        <div className="my-3 mx-4">
                            <p className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">auto_awesome</span>
                                Inspiração
                            </p>
                            <button
                                onClick={() => { navigate('/inspiration'); onClose(); }}
                                className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-terracotta-50/50 border border-terracotta-100 hover:bg-terracotta-100 transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <span className="material-symbols-outlined text-terracotta-500 fill text-xl">map</span>
                                    <span className="font-bold text-sunset-dark text-sm">Destinos 2026</span>
                                </div>
                                <span className="material-symbols-outlined text-terracotta-300 text-sm">chevron_right</span>
                            </button>
                        </div>

                        {/* Tendências */}
                        <button className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-terracotta-50/50 border border-terracotta-100 opacity-60 cursor-not-allowed">
                            <div className="flex items-center gap-4">
                                <span className="material-symbols-outlined text-terracotta-400">trending_up</span>
                                <span className="font-medium text-sunset-muted">Tendências</span>
                            </div>
                            <span className="bg-terracotta-400 text-white text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pro</span>
                        </button>

                        <div className="my-2 border-t border-terracotta-100/50 mx-4"></div>


                        <button
                            onClick={() => { navigate('/profile'); onClose(); }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-terracotta-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500">settings</span>
                            <span className="font-medium text-sunset-dark">Configurações</span>
                        </button>
                    </div>
                    <div className="mt-8 pt-8 border-t border-terracotta-100 mx-4">
                        <button
                            onClick={async () => {
                                onClose();
                                await authService.signOut();
                                navigate('/welcome');
                            }}
                            className="flex items-center gap-4 w-full px-4 py-3 rounded-xl hover:bg-red-50 transition-colors group"
                        >
                            <span className="material-symbols-outlined text-red-400">logout</span>
                            <span className="font-medium text-red-500">Sair</span>
                        </button>
                    </div>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;
