import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { TripSummary } from '../types';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_TRIP_IMAGE } from '../constants';

const Home: React.FC = () => {
    const navigate = useNavigate();
    const { profile } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [trips, setTrips] = useState<TripSummary[]>([]);

    useEffect(() => {
        const loadTrips = async () => {
            const data = await storageService.getTripsSummary();
            setTrips(data);
        };
        loadTrips();
    }, []);

    const nextTrip = useMemo(() => {
        return trips.find(t => t.status === 'confirmed');
    }, [trips]);

    const calculateDaysRemaining = (startDate: string) => {
        const diff = new Date(startDate).getTime() - new Date().getTime();
        return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const totalExpenses = useMemo(() => {
        return trips.reduce((total, trip) => total + (trip.totalSpent || 0), 0);
    }, [trips]);

    // Dynamic greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            <header className="px-6 pt-14 pb-6 flex items-center justify-between sticky top-0 z-30 bg-warm-cream/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-md ring-1 ring-terracotta-100 active:scale-90 transition-transform"
                    >
                        <img alt="Perfil" className="w-full h-full object-cover" src={profile?.avatar_url || 'https://ui-avatars.com/api/?background=random'} />
                    </button>
                    <div>
                        <p className="text-[10px] font-bold text-terracotta-500 uppercase tracking-widest leading-none mb-1">{getGreeting()},</p>
                        <h1 className="text-xl font-black text-sunset-dark leading-none">{profile?.full_name?.split(' ')[0] || 'Viajante'}! ✨</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate('/notifications')}
                        className="w-12 h-12 rounded-2xl bg-white border border-terracotta-50 flex items-center justify-center shadow-sm active:scale-95 transition-transform text-sunset-muted relative"
                    >
                        <span className="material-symbols-outlined">notifications</span>
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="w-12 h-12 rounded-2xl bg-white border border-terracotta-50 flex items-center justify-center shadow-sm active:scale-95 transition-transform text-sunset-muted"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </header>

            <main className="flex-1 px-6 space-y-8 animate-fade-in">
                {/* 1. NEXT TRIP WIDGET (Premium Hero) */}
                {nextTrip ? (
                    <section className="relative h-[240px] rounded-[40px] overflow-hidden shadow-2xl group active:scale-[0.98] transition-all" onClick={() => navigate(`/trip/${nextTrip.id}`)}>
                        <img
                            src={nextTrip.imageUrl || DEFAULT_TRIP_IMAGE}
                            alt={nextTrip.title}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-sunset-dark via-sunset-dark/20 to-transparent"></div>

                        <div className="absolute top-6 left-6">
                            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter border border-white/20">
                                Próxima Aventura
                            </span>
                        </div>

                        <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                            <div className="text-white">
                                <h2 className="text-3xl font-black mb-1">{nextTrip.title}</h2>
                                <p className="text-sm font-medium opacity-80 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">calendar_month</span>
                                    {calculateDaysRemaining(nextTrip.startDate)} dias restantes
                                </p>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white text-sunset-dark flex items-center justify-center shadow-lg">
                                <span className="material-symbols-outlined font-bold">arrow_forward</span>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section
                        className="h-[180px] rounded-[40px] border-2 border-dashed border-terracotta-200 flex flex-col items-center justify-center text-center p-8 space-y-2 active:bg-terracotta-50/50 transition-colors"
                        onClick={() => navigate('/add-trip')}
                    >
                        <span className="material-symbols-outlined text-4xl text-terracotta-300">add_location_alt</span>
                        <p className="font-bold text-sunset-dark">Para onde vamos agora?</p>
                        <p className="text-xs text-sunset-muted">Comece a planejar sua próxima trip de 2026</p>
                    </section>
                )}

                {/* 2. SUMMARY WIDGETS GRID */}
                <div className="grid grid-cols-2 gap-4">
                    {/* Finance Widget */}
                    <div
                        className="bg-white rounded-[32px] p-6 border border-terracotta-100 shadow-sm space-y-4 active:scale-95 transition-transform"
                        onClick={() => navigate('/finance')}
                    >
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <span className="material-symbols-outlined fill">payments</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-1">Contas</p>
                            <p className="text-lg font-black text-sunset-dark">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalExpenses)}
                            </p>
                            <p className="text-[10px] font-bold text-terracotta-500">Total em Viagens</p>
                        </div>
                    </div>

                    {/* Holidays Widget */}
                    <div
                        className="bg-white rounded-[32px] p-6 border border-terracotta-100 shadow-sm space-y-4 active:scale-95 transition-transform"
                        onClick={() => navigate('/holidays')}
                    >
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                            <span className="material-symbols-outlined fill">celebration</span>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-1">Feriado</p>
                            <p className="text-lg font-black text-sunset-dark">--</p>
                            <p className="text-[10px] font-bold text-amber-500">Consulte o calendário</p>
                        </div>
                    </div>
                </div>

                {/* 3. TRENDING SUGGESTIONS (2026 Inspiration) */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-sunset-dark">Para você se inspirar</h3>
                        <button
                            onClick={() => navigate('/inspiration')}
                            className="text-xs font-bold text-terracotta-500 uppercase tracking-wider active:scale-95 transition-transform"
                        >
                            Ver Tudo
                        </button>
                    </div>

                    <div className="space-y-4">
                        {[
                            { title: 'Inverno em Bariloche', tag: 'Aventura', img: 'https://images.unsplash.com/photo-1549419137-0104642ae7a8?auto=format&fit=crop&w=800&q=80', price: 'R$ 4.200' },
                            { title: 'Vilas de Mykonos', tag: 'Relax', img: 'https://images.unsplash.com/photo-1518459031451-79b57c614b91?auto=format&fit=crop&w=800&q=80', price: 'R$ 8.900' },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white rounded-[32px] overflow-hidden border border-terracotta-100 shadow-sm flex items-center gap-4 p-3 group active:scale-[0.98] transition-all">
                                <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                                    <img
                                        src={item.img}
                                        alt=""
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                    />
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <span className="text-[8px] font-black text-terracotta-500 uppercase tracking-tighter mb-1 px-2 py-0.5 bg-terracotta-50 w-fit rounded-full">{item.tag}</span>
                                    <h4 className="font-bold text-sunset-dark mb-1 leading-tight">{item.title}</h4>
                                    <p className="text-[10px] text-sunset-muted font-bold tracking-tight">Médias de {item.price}</p>
                                </div>
                                <button className="w-10 h-10 rounded-full flex items-center justify-center text-terracotta-200 group-hover:text-terracotta-500 transition-colors">
                                    <span className="material-symbols-outlined">favorite</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. RECENT ACTIVITY (Modern Feed Style) */}
                <section className="bg-sunset-dark rounded-[40px] p-8 text-white space-y-6">
                    <div>
                        <h3 className="text-xl font-bold mb-1">Comece sua Jornada</h3>
                        <p className="text-xs opacity-60">Aqui aparecerão as novidades das suas viagens</p>
                    </div>

                    <div className="space-y-4 py-4 text-center">
                        <span className="material-symbols-outlined text-4xl opacity-20">travel_explore</span>
                        <p className="text-sm opacity-60">Nenhuma atividade recente por enquanto.</p>
                    </div>
                </section>
            </main>

            <BottomNav />
        </div>
    );
};

export default Home;
