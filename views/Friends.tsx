import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import Toast, { ToastType } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { profileService } from '../services/profileService';

interface Friend {
    id: string;
    name: string;
    username: string;
    avatar: string;
    trips: number;
    isFavorite: boolean;
    lastTrip?: string;
}

const Friends: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [friends, setFriends] = useState<Friend[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'favorites'>('all');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newFriendUsername, setNewFriendUsername] = useState('');

    const filteredFriends = friends.filter(friend => {
        const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            friend.username.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || friend.isFavorite;
        return matchesSearch && matchesFilter;
    });

    const toggleFavorite = (id: string) => {
        setFriends(friends.map(f =>
            f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
        ));
    };

    const handleAddFriend = () => {
        if (!newFriendUsername.trim()) return;
        setToast({ message: 'Funcionalidade de amigos em breve!', type: 'success' });
        setNewFriendUsername('');
        setShowAddModal(false);
    };

    const favoritesCount = friends.filter(f => f.isFavorite).length;

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <header className="sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md px-6 pt-14 pb-4 border-b border-terracotta-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="flex items-center justify-center transition-transform active:scale-90"
                        >
                            <span className="material-symbols-outlined text-2xl text-sunset-dark">menu</span>
                        </button>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-sunset-dark">Amigos</h1>
                            <p className="text-xs text-sunset-muted">Conecte-se com viajantes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-10 h-10 rounded-full bg-terracotta-500 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-white">person_add</span>
                    </button>
                </div>

                <div className="relative mb-4">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted">search</span>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Buscar amigo..."
                        className="w-full h-12 pl-12 pr-4 bg-white border border-terracotta-100 rounded-2xl text-sm font-medium text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                    />
                </div>
            </header>

            <main className="flex-1 px-6 py-4 space-y-3">
                <div className="bg-white/50 rounded-3xl p-12 border border-dashed border-terracotta-200 text-center mt-8">
                    <span className="material-symbols-outlined text-5xl text-terracotta-200">group_add</span>
                    <p className="font-bold text-sunset-dark mt-4">Sua rede está crescendo!</p>
                    <p className="text-xs text-sunset-muted mt-2 px-4 leading-relaxed">
                        Em breve você poderá adicionar seus amigos para dividirem gastos e roteiros.
                    </p>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-6 px-6 py-2.5 bg-terracotta-50 text-terracotta-600 font-bold rounded-full text-xs active:scale-95 transition-all"
                    >
                        Convidar Amigos
                    </button>
                </div>
            </main>

            {/* Add Friend Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
                    <div className="relative w-full bg-white rounded-3xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold mb-2">Convidar Amigo</h2>
                        <p className="text-sm text-sunset-muted mb-4">
                            Em breve você poderá convidar amigos pelo e-mail ou username.
                        </p>
                        <button
                            onClick={() => setShowAddModal(false)}
                            className="w-full h-12 bg-terracotta-500 text-white font-bold rounded-2xl active:scale-95 transition-all"
                        >
                            Entendi
                        </button>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
};

export default Friends;
