// VERSION_TIMESTAMP: 2026-01-27T17:11:00
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Trip, Expense } from '../types';
import BottomNav from '../components/BottomNav';
import { DEFAULT_TRIP_IMAGE } from '../constants';
import Sidebar from '../components/Sidebar';

const TripAbout: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const loadTripData = async () => {
            if (id) {
                const tripData = await storageService.getTripById(id);
                setTrip(tripData);
                const tripExpenses = await storageService.getExpensesByTrip(id);
                setExpenses(tripExpenses);
            }
        };
        loadTripData();
    }, [id]);

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const shareUrl = `${window.location.origin}/#/join/${id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(shareUrl);
        // O ideal seria um toast aqui, mas vamos usar o que temos
        alert('Link copiado com sucesso! 🚀');
    };

    const handleWhatsAppShare = () => {
        const text = `Bora viajar comigo? Junte-se à viagem "${trip?.title}" no Triip! ✈️🌍\n\nConfira os detalhes e entre aqui: ${shareUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    if (!trip) {
        return (
            <div className="min-h-screen bg-warm-cream flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-terracotta-200 border-t-terracotta-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const budgetPercentage = trip.budget ? (totalSpent / trip.budget) * 100 : 0;
    const daysUntilTrip = trip.startDate ? Math.ceil((new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return (
        <div className="min-h-screen bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Hero Header */}
            <div className="relative h-[280px] w-full max-w-[480px] mx-auto">
                <img
                    src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                    alt={trip.title}
                    className="w-full h-full object-cover"
                    onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>

                {/* Back Button */}
                <button
                    onClick={() => navigate(`/trip/${id}`)}
                    className="absolute top-14 left-6 w-10 h-10 flex items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg active:scale-95 transition-transform z-10"
                >
                    <span className="material-symbols-outlined text-sunset-dark">arrow_back</span>
                </button>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center gap-2 mb-2">
                        {trip.status === 'confirmed' && (
                            <span className="bg-emerald-500 text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase">Confirmada</span>
                        )}
                        {trip.status === 'draft' && (
                            <span className="bg-amber-500 text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase">Rascunho</span>
                        )}
                        {trip.status === 'past' && (
                            <span className="bg-sunset-muted text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase">Passada</span>
                        )}
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">{trip.title}</h1>
                    <p className="text-white/80 text-sm flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {trip.destination}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-[480px] mx-auto px-6 -mt-4 relative z-10 space-y-6">

                {/* Countdown Card */}
                {daysUntilTrip !== null && daysUntilTrip > 0 && trip.status !== 'past' && (
                    <div className="bg-gradient-to-r from-terracotta-500 to-amber-500 rounded-3xl p-5 text-white shadow-xl shadow-terracotta-500/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-white/80 text-xs font-bold uppercase tracking-wider">Contagem Regressiva</p>
                                <p className="text-4xl font-black mt-1">{daysUntilTrip} dias</p>
                                <p className="text-white/70 text-sm">para a viagem começar</p>
                            </div>
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl">flight_takeoff</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Info Grid */}
                <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-terracotta-500">info</span>
                        Informações Gerais
                    </h2>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Dates */}
                        <div className="bg-warm-cream rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-terracotta-400 text-lg">calendar_month</span>
                                <span className="text-[10px] font-bold text-sunset-muted uppercase tracking-wider">Período</span>
                            </div>
                            <p className="font-bold text-sunset-dark">{trip.dateRange || 'A definir'}</p>
                        </div>

                        {/* Destination */}
                        <div className="bg-warm-cream rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-terracotta-400 text-lg">location_on</span>
                                <span className="text-[10px] font-bold text-sunset-muted uppercase tracking-wider">Destino</span>
                            </div>
                            <p className="font-bold text-sunset-dark">{trip.destination}</p>
                        </div>

                        {/* Budget */}
                        <div className="bg-warm-cream rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-terracotta-400 text-lg">payments</span>
                                <span className="text-[10px] font-bold text-sunset-muted uppercase tracking-wider">Orçamento</span>
                            </div>
                            <p className="font-bold text-sunset-dark">
                                {trip.budget ? `R$ ${trip.budget.toLocaleString('pt-BR')}` : 'A definir'}
                            </p>
                        </div>

                        {/* Participants */}
                        <div className="bg-warm-cream rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="material-symbols-outlined text-terracotta-400 text-lg">group</span>
                                <span className="text-[10px] font-bold text-sunset-muted uppercase tracking-wider">Viajantes</span>
                            </div>
                            <p className="font-bold text-sunset-dark">{trip.participants?.length || 0} pessoas</p>
                        </div>
                    </div>
                </div>

                {/* Budget Progress */}
                {trip.budget && (
                    <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm">
                        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-terracotta-500">account_balance_wallet</span>
                            Controle de Gastos
                        </h2>

                        <div className="space-y-4">
                            <div className="flex items-end justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-sunset-muted uppercase tracking-wider">Gasto até agora</p>
                                    <p className="text-2xl font-black text-sunset-dark">R$ {totalSpent.toLocaleString('pt-BR')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-sunset-muted uppercase tracking-wider">Orçamento</p>
                                    <p className="text-lg font-bold text-sunset-muted">R$ {trip.budget.toLocaleString('pt-BR')}</p>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative h-3 bg-terracotta-100 rounded-full overflow-hidden">
                                <div
                                    className={`absolute left-0 top-0 h-full rounded-full transition-all ${budgetPercentage > 90 ? 'bg-red-500' :
                                        budgetPercentage > 70 ? 'bg-amber-500' :
                                            'bg-emerald-500'
                                        }`}
                                    style={{ width: `${Math.min(budgetPercentage, 100)}%` }}
                                ></div>
                            </div>

                            <div className="flex items-center justify-between text-xs">
                                <span className={`font-bold ${budgetPercentage > 90 ? 'text-red-500' :
                                    budgetPercentage > 70 ? 'text-amber-500' :
                                        'text-emerald-500'
                                    }`}>
                                    {budgetPercentage.toFixed(0)}% utilizado
                                </span>
                                <span className="text-sunset-muted">
                                    Resta: R$ {(trip.budget - totalSpent).toLocaleString('pt-BR')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => navigate(`/finance/${id}`)}
                            className="w-full mt-4 h-12 bg-terracotta-50 border border-terracotta-100 text-terracotta-600 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <span className="material-symbols-outlined">receipt_long</span>
                            Ver Todas as Despesas
                        </button>
                    </div>
                )}

                {/* Participants Section */}
                <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm">
                    <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-terracotta-500">group</span>
                        Participantes
                        <span className="text-xs bg-terracotta-100 text-terracotta-600 px-2 py-0.5 rounded-full ml-auto">
                            {trip.participants?.length || 0}
                        </span>
                    </h2>

                    <div className="space-y-3">
                        {trip.participants && trip.participants.map((participant) => (
                            <div key={participant.id} className="flex items-center gap-3 p-3 bg-warm-cream rounded-2xl">
                                <img
                                    src={participant.avatar}
                                    alt={participant.name}
                                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                />
                                <div>
                                    <p className="font-bold text-sunset-dark">{participant.name}</p>
                                    <p className="text-[10px] text-sunset-muted">Viajante</p>
                                </div>
                            </div>
                        ))}

                        {(!trip.participants || trip.participants.length === 0) && (
                            <div className="text-center py-8 text-sunset-muted">
                                <span className="material-symbols-outlined text-4xl opacity-30 mb-2">group_off</span>
                                <p className="text-sm">Nenhum participante adicionado</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Share Button Section */}
                <div className="bg-gradient-to-br from-sunset-dark to-sunset-dark/90 rounded-3xl p-6 text-white shadow-xl shadow-sunset-dark/20 text-center">
                    <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-white text-3xl">share</span>
                    </div>
                    <h3 className="font-black text-xl mb-1">Convidar Viajantes</h3>
                    <p className="text-white/60 text-xs mb-6 px-4">Envie um link único para que seus amigos possam ver e se juntar a esta viagem.</p>

                    <button
                        onClick={() => setIsShareModalOpen(true)}
                        className="w-full h-14 bg-white text-sunset-dark font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        Gerar Link de Convite
                        <span className="material-symbols-outlined">link</span>
                    </button>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate(`/edit-trip/${id}`)}
                        className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl border border-terracotta-100 shadow-sm active:scale-95 transition-all"
                    >
                        <div className="w-12 h-12 bg-terracotta-50 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-terracotta-500">edit</span>
                        </div>
                        <span className="text-sm font-bold text-sunset-dark">Editar Viagem</span>
                    </button>

                    <button
                        onClick={() => navigate(`/trip/${id}`)}
                        className="flex flex-col items-center justify-center gap-2 p-5 bg-white rounded-2xl border border-terracotta-100 shadow-sm active:scale-95 transition-all"
                    >
                        <div className="w-12 h-12 bg-terracotta-50 rounded-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-terracotta-500">explore</span>
                        </div>
                        <span className="text-sm font-bold text-sunset-dark">Ver Sugestões</span>
                    </button>
                </div>

                {/* Share Modal */}
                {isShareModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                        <div className="w-full max-w-[480px] bg-white rounded-t-[40px] p-8 space-y-6 animate-slide-up">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-2xl font-black text-sunset-dark tracking-tight">Compartilhar</h2>
                                <button onClick={() => setIsShareModalOpen(false)} className="w-10 h-10 rounded-full bg-terracotta-50 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-sunset-dark">close</span>
                                </button>
                            </div>

                            <p className="text-sunset-muted text-sm font-medium">Use os canais abaixo para convidar pessoas para sua viagem:</p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleWhatsAppShare}
                                    className="w-full h-16 bg-[#25D366] text-white rounded-2xl font-black flex items-center px-6 gap-4 shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all"
                                >
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                        <i className="fa-brands fa-whatsapp text-2xl"></i>
                                    </div>
                                    <span className="flex-1 text-left">Enviar via WhatsApp</span>
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>

                                <div className="p-4 bg-terracotta-50 rounded-2xl border border-terracotta-100 space-y-3">
                                    <p className="text-[10px] font-black text-sunset-muted uppercase tracking-widest text-center">Ou copie o link direto</p>
                                    <div className="flex items-center gap-2 bg-white rounded-xl p-2 border border-terracotta-100">
                                        <div className="flex-1 truncate text-xs font-bold text-sunset-muted px-2">
                                            {shareUrl}
                                        </div>
                                        <button
                                            onClick={handleCopyLink}
                                            className="h-10 px-4 bg-terracotta-500 text-white rounded-lg font-bold text-xs active:scale-95 transition-all"
                                        >
                                            Copiar
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="text-center pt-2">
                                <p className="text-[10px] text-sunset-muted font-medium italic">Seus amigos poderão ver o roteiro e se juntar ao grupo.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Created Date */}
                <div className="text-center py-4">
                    <p className="text-[10px] text-sunset-muted">
                        Viagem criada em {new Date(trip.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <BottomNav />
        </div>
    );
};

export default TripAbout;
