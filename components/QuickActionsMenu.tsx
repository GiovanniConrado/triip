import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Trip, TripStatus, TripType, FinanceMode, Participant } from '../types';
import { DEFAULT_TRIP_IMAGE } from '../constants';
import ImageUpload from './ImageUpload';

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    color: string;
    description: string;
}

const quickActions: QuickAction[] = [
    {
        id: 'trip',
        label: 'Nova Viagem',
        icon: 'flight_takeoff',
        color: 'from-terracotta-500 to-terracotta-600',
        description: 'Planeje uma nova aventura',
    },
    {
        id: 'expense',
        label: 'Adicionar Gasto',
        icon: 'payments',
        color: 'from-amber-500 to-orange-600',
        description: 'Apenas viagens confirmadas',
    },
    {
        id: 'suggestion',
        label: 'Adicionar Item',
        icon: 'add_location_alt',
        color: 'from-blue-500 to-indigo-600',
        description: 'No roteiro ou ideias',
    },
];

const SUGGESTION_CATEGORIES = [
    { id: 'Hospedagem', icon: 'bed', label: 'Hospedagem' },
    { id: 'Transporte', icon: 'flight', label: 'Transporte' },
    { id: 'Passeios', icon: 'confirmation_number', label: 'Passeios' },
    { id: 'Restaurantes', icon: 'restaurant', label: 'Restaurantes' },
    { id: 'Outros', icon: 'shopping_bag', label: 'Outros' },
];

interface QuickActionsMenuProps {
    isOpen: boolean;
    onClose: () => void;
}

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [selectedAction, setSelectedAction] = useState<string | null>(null);
    const [isSelectingTrip, setIsSelectingTrip] = useState(false);
    const [trips, setTrips] = useState<Trip[]>([]);

    // Trip wizard state
    const [wizardStep, setWizardStep] = useState(1);
    const [tripTitle, setTripTitle] = useState('');
    const [tripDestination, setTripDestination] = useState('');
    const [tripStatus, setTripStatus] = useState<TripStatus>('draft');
    const [tripStartDate, setTripStartDate] = useState('');
    const [tripEndDate, setTripEndDate] = useState('');
    const [tripType, setTripType] = useState<TripType>('group');
    const [financeMode, setFinanceMode] = useState<FinanceMode>('split');

    // Suggestion form state
    const [isAddingSuggestion, setIsAddingSuggestion] = useState(false);
    const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
    const [suggestionTitle, setSuggestionTitle] = useState('');
    const [suggestionCategory, setSuggestionCategory] = useState('Hospedagem');
    const [suggestionLocation, setSuggestionLocation] = useState('');
    const [suggestionLink, setSuggestionLink] = useState('');
    const [suggestionPrice, setSuggestionPrice] = useState('');
    const [suggestionDescription, setSuggestionDescription] = useState('');
    const [suggestionImageUrl, setSuggestionImageUrl] = useState('');
    const [suggestionStatus, setSuggestionStatus] = useState<'idea' | 'confirmed'>('confirmed');
    const [suggestionCreateExpense, setSuggestionCreateExpense] = useState(false);
    const [suggestionPaidBy, setSuggestionPaidBy] = useState('');

    useEffect(() => {
        const loadTrips = async () => {
            if (isOpen) {
                const data = await storageService.getTrips();
                setTrips(data);
            } else {
                resetAll();
            }
        };
        loadTrips();
    }, [isOpen]);

    const resetAll = () => {
        setSelectedAction(null);
        setIsSelectingTrip(false);
        setWizardStep(1);
        setTripTitle('');
        setTripDestination('');
        setTripStatus('draft');
        setTripStartDate('');
        setTripEndDate('');
        setTripType('group');
        setFinanceMode('split');
        setIsAddingSuggestion(false);
        setSelectedTrip(null);
        setSuggestionTitle('');
        setSuggestionCategory('Hospedagem');
        setSuggestionLocation('');
        setSuggestionLink('');
        setSuggestionPrice('');
        setSuggestionDescription('');
        setSuggestionImageUrl('');
        setSuggestionStatus('confirmed');
        setSuggestionCreateExpense(false);
        setSuggestionPaidBy('');
    };

    const handleActionClick = (action: QuickAction) => {
        setSelectedAction(action.id);
        if (action.id === 'trip') {
            setWizardStep(1);
        } else if (action.id === 'expense' || action.id === 'suggestion') {
            setIsSelectingTrip(true);
        }
    };

    const handleTripSelect = async (tripId: string) => {
        if (selectedAction === 'expense') {
            setTimeout(() => {
                navigate(`/finance/${tripId}/add`);
                onClose();
            }, 200);
        } else if (selectedAction === 'suggestion') {
            const trip = await storageService.getTripById(tripId);
            setSelectedTrip(trip);
            if (trip?.participants?.length > 0) {
                setSuggestionPaidBy(trip.participants[0].id);
            }
            setIsSelectingTrip(false);
            setIsAddingSuggestion(true);
        }
    };

    const handleCreateTrip = async () => {
        const dateRange = tripStartDate && tripEndDate
            ? `${formatDate(tripStartDate)} - ${formatDate(tripEndDate)}`
            : 'A definir';

        const newTrip = await storageService.createTrip({
            title: tripTitle.trim(),
            destination: tripDestination.trim(),
            dateRange,
            startDate: tripStartDate,
            endDate: tripEndDate,
            imageUrl: DEFAULT_TRIP_IMAGE,
            status: tripStatus,
            tripType,
            financeMode,
            participants: [],
        });

        if (newTrip) {
            setTimeout(() => {
                navigate(`/trip/${newTrip.id}`);
                onClose();
            }, 200);
        }
    };

    const handleCreateSuggestion = async () => {
        if (!suggestionTitle.trim() || !selectedTrip) return;

        const created = await storageService.createSuggestion({
            tripId: selectedTrip.id,
            title: suggestionTitle.trim(),
            category: suggestionCategory,
            location: suggestionLocation || 'A definir',
            price: suggestionPrice ? `R$ ${suggestionPrice}` : 'A consultar',
            rating: 5,
            imageUrl: suggestionImageUrl || DEFAULT_TRIP_IMAGE,
            description: suggestionLink ? `${suggestionDescription}\n\nLink: ${suggestionLink}` : suggestionDescription,
            status: suggestionStatus,
            comments: [],
            externalUrl: suggestionLink || undefined,
        });

        if (created) {
            // Case: Auto-create expense
            if (suggestionCreateExpense && suggestionPrice && suggestionStatus === 'confirmed') {
                await storageService.createExpense({
                    tripId: selectedTrip.id,
                    amount: parseFloat(suggestionPrice.replace(',', '.')),
                    description: `Reserva: ${suggestionTitle}`,
                    category: suggestionCategory as any,
                    paidBy: suggestionPaidBy,
                    participants: selectedTrip.participants.map(p => p.id),
                    status: 'pending',
                    date: new Date().toISOString()
                });
            }

            setTimeout(() => {
                navigate(`/trip/${selectedTrip.id}`);
                onClose();
            }, 200);
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const goBack = () => {
        if (wizardStep > 1 && selectedAction === 'trip') {
            setWizardStep(step => step - 1);
        } else if (isAddingSuggestion) {
            setIsAddingSuggestion(false);
            setIsSelectingTrip(true);
        } else {
            resetAll();
        }
    };

    const canProceedStep1 = tripTitle.trim() && tripDestination.trim();
    const canProceedStep2 = true; // Dates are optional
    const canProceedStep3 = tripType !== null;
    const canCreateTrip = canProceedStep1 && tripType && financeMode;

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] transition-opacity duration-300"
                onClick={onClose}
                style={{ animation: 'fadeIn 0.3s ease-out' }}
            />

            {/* Menu Container */}
            <div
                className="fixed inset-x-0 bottom-0 z-[100] max-w-[480px] mx-auto"
                style={{ animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                <div className="bg-warm-cream rounded-t-[32px] shadow-2xl border-t border-terracotta-100/50 pb-8 max-h-[85vh] overflow-y-auto no-scrollbar">
                    {/* Handle Bar */}
                    <div className="flex justify-center pt-4 pb-2 sticky top-0 bg-warm-cream z-10">
                        <div className="w-12 h-1.5 bg-terracotta-200 rounded-full" />
                    </div>

                    {/* ==================== MAIN MENU ==================== */}
                    {!selectedAction && (
                        <>
                            <div className="px-6 pt-2 pb-6">
                                <h2 className="text-2xl font-bold text-sunset-dark mb-1">Ação Rápida</h2>
                                <p className="text-sm text-sunset-muted">O que você gostaria de fazer?</p>
                            </div>

                            <div className="px-6 space-y-3">
                                {quickActions.map((action, index) => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleActionClick(action)}
                                        className="w-full group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95"
                                        style={{ animation: `slideInRight 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1}s both` }}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-r ${action.color} opacity-10 group-hover:opacity-20 transition-opacity`} />
                                        <div className="relative flex items-center gap-4 p-5 bg-white border border-terracotta-100 rounded-2xl shadow-sm group-hover:shadow-md transition-shadow">
                                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                                                <span className="material-symbols-outlined text-white text-2xl fill">{action.icon}</span>
                                            </div>
                                            <div className="flex-1 text-left">
                                                <h3 className="font-bold text-sunset-dark text-lg mb-0.5">{action.label}</h3>
                                                <p className="text-xs text-sunset-muted">{action.description}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-sunset-muted group-hover:text-terracotta-500 group-hover:translate-x-1 transition-all">arrow_forward</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    {/* ==================== TRIP WIZARD ==================== */}
                    {selectedAction === 'trip' && (
                        <div className="animate-fade-in">
                            {/* Header */}
                            <div className="px-6 pt-2 pb-4 flex items-center gap-4">
                                <button onClick={goBack} className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div className="flex-1">
                                    <h2 className="text-xl font-bold text-sunset-dark">Nova Viagem</h2>
                                    <p className="text-xs text-sunset-muted">Etapa {wizardStep} de 4</p>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="px-6 pb-4">
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(step => (
                                        <div key={step} className={`flex-1 h-1.5 rounded-full transition-colors ${step <= wizardStep ? 'bg-terracotta-500' : 'bg-terracotta-100'}`} />
                                    ))}
                                </div>
                            </div>

                            {/* Step 1: Name + Destination */}
                            {wizardStep === 1 && (
                                <div className="px-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Nome da Viagem</label>
                                        <input
                                            type="text"
                                            value={tripTitle}
                                            onChange={(e) => setTripTitle(e.target.value)}
                                            placeholder="Ex: Férias de Verão"
                                            className="w-full h-14 px-5 bg-white border border-terracotta-100 rounded-2xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Destino</label>
                                        <input
                                            type="text"
                                            value={tripDestination}
                                            onChange={(e) => setTripDestination(e.target.value)}
                                            placeholder="Ex: Rio de Janeiro"
                                            className="w-full h-14 px-5 bg-white border border-terracotta-100 rounded-2xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                        />
                                    </div>
                                    <button
                                        onClick={() => setWizardStep(2)}
                                        disabled={!canProceedStep1}
                                        className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        Próximo
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Status + Dates */}
                            {wizardStep === 2 && (
                                <div className="px-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-3">Status da Viagem</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setTripStatus('confirmed')}
                                                className={`p-4 rounded-2xl border-2 text-center transition-all ${tripStatus === 'confirmed' ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 bg-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-2xl ${tripStatus === 'confirmed' ? 'text-terracotta-500' : 'text-sunset-muted'}`}>check_circle</span>
                                                <p className={`font-bold mt-2 ${tripStatus === 'confirmed' ? 'text-terracotta-600' : 'text-sunset-dark'}`}>Confirmada</p>
                                                <p className="text-[10px] text-sunset-muted mt-1">Vai rolar!</p>
                                            </button>
                                            <button
                                                onClick={() => setTripStatus('draft')}
                                                className={`p-4 rounded-2xl border-2 text-center transition-all ${tripStatus === 'draft' ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 bg-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-2xl ${tripStatus === 'draft' ? 'text-terracotta-500' : 'text-sunset-muted'}`}>edit_note</span>
                                                <p className={`font-bold mt-2 ${tripStatus === 'draft' ? 'text-terracotta-600' : 'text-sunset-dark'}`}>Rascunho</p>
                                                <p className="text-[10px] text-sunset-muted mt-1">Ainda planejando</p>
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-3">Datas (opcional)</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <p className="text-[10px] text-sunset-muted mb-1">Início</p>
                                                <input
                                                    type="date"
                                                    value={tripStartDate}
                                                    onChange={(e) => setTripStartDate(e.target.value)}
                                                    className="w-full h-12 px-4 bg-white border border-terracotta-100 rounded-xl text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                                />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-sunset-muted mb-1">Fim</p>
                                                <input
                                                    type="date"
                                                    value={tripEndDate}
                                                    onChange={(e) => setTripEndDate(e.target.value)}
                                                    min={tripStartDate}
                                                    className="w-full h-12 px-4 bg-white border border-terracotta-100 rounded-xl text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setWizardStep(3)}
                                        className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        Próximo
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            )}

                            {/* Step 3: Solo or Group */}
                            {wizardStep === 3 && (
                                <div className="px-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-3">Tipo de Viagem</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setTripType('solo')}
                                                className={`p-5 rounded-2xl border-2 text-center transition-all ${tripType === 'solo' ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 bg-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-3xl ${tripType === 'solo' ? 'text-terracotta-500 fill' : 'text-sunset-muted'}`}>person</span>
                                                <p className={`font-bold mt-2 ${tripType === 'solo' ? 'text-terracotta-600' : 'text-sunset-dark'}`}>Solo</p>
                                                <p className="text-[10px] text-sunset-muted mt-1">Viajo sozinho(a)</p>
                                            </button>
                                            <button
                                                onClick={() => setTripType('group')}
                                                className={`p-5 rounded-2xl border-2 text-center transition-all ${tripType === 'group' ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 bg-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-3xl ${tripType === 'group' ? 'text-terracotta-500 fill' : 'text-sunset-muted'}`}>groups</span>
                                                <p className={`font-bold mt-2 ${tripType === 'group' ? 'text-terracotta-600' : 'text-sunset-dark'}`}>Grupo</p>
                                                <p className="text-[10px] text-sunset-muted mt-1">Com amigos/família</p>
                                            </button>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setWizardStep(4)}
                                        className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        Próximo
                                        <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            )}

                            {/* Step 4: Finance Mode */}
                            {wizardStep === 4 && (
                                <div className="px-6 space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-3">Como gerenciar gastos?</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => setFinanceMode('track')}
                                                className={`p-5 rounded-2xl border-2 text-center transition-all ${financeMode === 'track' ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 bg-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-3xl ${financeMode === 'track' ? 'text-terracotta-500 fill' : 'text-sunset-muted'}`}>account_balance_wallet</span>
                                                <p className={`font-bold mt-2 ${financeMode === 'track' ? 'text-terracotta-600' : 'text-sunset-dark'}`}>Controlar</p>
                                                <p className="text-[10px] text-sunset-muted mt-1">Anotar meus gastos</p>
                                            </button>
                                            <button
                                                onClick={() => setFinanceMode('split')}
                                                className={`p-5 rounded-2xl border-2 text-center transition-all ${financeMode === 'split' ? 'border-terracotta-500 bg-terracotta-50' : 'border-terracotta-100 bg-white'}`}
                                            >
                                                <span className={`material-symbols-outlined text-3xl ${financeMode === 'split' ? 'text-terracotta-500 fill' : 'text-sunset-muted'}`}>payments</span>
                                                <p className={`font-bold mt-2 ${financeMode === 'split' ? 'text-terracotta-600' : 'text-sunset-dark'}`}>Dividir</p>
                                                <p className="text-[10px] text-sunset-muted mt-1">Rachar despesas</p>
                                            </button>
                                        </div>
                                        {tripType === 'solo' && financeMode === 'split' && (
                                            <p className="text-xs text-terracotta-500 text-center mt-3 bg-terracotta-50 p-2 rounded-xl">
                                                💡 Você poderá convidar pessoas depois
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleCreateTrip}
                                        disabled={!canCreateTrip}
                                        className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined">flight_takeoff</span>
                                        Criar Viagem
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ==================== TRIP SELECTION ==================== */}
                    {isSelectingTrip && (
                        <div className="animate-fade-in">
                            <div className="px-6 pt-2 pb-6 flex items-center gap-4">
                                <button onClick={goBack} className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-sunset-dark">Selecionar Viagem</h2>
                                    <p className="text-xs text-sunset-muted">{selectedAction === 'expense' ? 'Onde foi o gasto?' : 'Para qual viagem?'}</p>
                                </div>
                            </div>

                            <div className="px-6 space-y-3 max-h-[40vh] overflow-y-auto no-scrollbar pb-4">
                                {(() => {
                                    const filteredTrips = trips.filter(t => t.status === 'confirmed');
                                    if (filteredTrips.length === 0) {
                                        return (
                                            <div className="py-10 text-center">
                                                <span className="material-symbols-outlined text-4xl text-terracotta-200 mb-3 block">flight_takeoff</span>
                                                <p className="text-sunset-muted text-sm">Nenhuma viagem confirmada.</p>
                                                <p className="text-sunset-muted text-xs mt-1">Confirme uma viagem primeiro.</p>
                                            </div>
                                        );
                                    }
                                    return filteredTrips.map((trip, index) => (
                                        <button
                                            key={trip.id}
                                            onClick={() => handleTripSelect(trip.id)}
                                            style={{ animation: `slideInUp 0.3s ease-out ${index * 0.05}s both` }}
                                            className="w-full flex items-center gap-4 p-4 bg-white border border-terracotta-100 rounded-2xl shadow-sm active:scale-[0.98] transition-all hover:border-terracotta-300"
                                        >
                                            <div className="w-12 h-12 rounded-xl overflow-hidden shadow-sm flex-shrink-0">
                                                <img
                                                    src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                                />
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <h4 className="font-bold text-sunset-dark truncate">{trip.title}</h4>
                                                <p className="text-[10px] text-sunset-muted">{trip.destination}</p>
                                            </div>
                                            <span className="material-symbols-outlined text-terracotta-300 text-lg">chevron_right</span>
                                        </button>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {/* ==================== SUGGESTION FORM ==================== */}
                    {isAddingSuggestion && (
                        <div className="animate-fade-in">
                            <div className="px-6 pt-2 pb-4 flex items-center gap-4">
                                <button onClick={goBack} className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined">arrow_back</span>
                                </button>
                                <div>
                                    <h2 className="text-xl font-bold text-sunset-dark">Adicionar Item</h2>
                                    <p className="text-xs text-sunset-muted">{selectedTrip?.title || 'Preencha os detalhes'}</p>
                                </div>
                            </div>

                            <div className="px-6 space-y-4 pb-4">
                                {/* Status Toggle */}
                                <div>
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Tipo do Item</label>
                                    <div className="flex p-1 bg-terracotta-100/40 rounded-2xl">
                                        <button
                                            type="button"
                                            onClick={() => setSuggestionStatus('confirmed')}
                                            className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${suggestionStatus === 'confirmed' ? 'bg-emerald-500 text-white shadow-sm' : 'text-sunset-muted'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">check_circle</span>
                                            Confirmado
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSuggestionStatus('idea')}
                                            className={`flex-1 py-3 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${suggestionStatus === 'idea' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'}`}
                                        >
                                            <span className="material-symbols-outlined text-lg">lightbulb</span>
                                            Sugestão / Ideia
                                        </button>
                                    </div>
                                </div>

                                {/* Category Selector */}
                                <div>
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Categoria</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {SUGGESTION_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setSuggestionCategory(cat.id)}
                                                className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${suggestionCategory === cat.id
                                                    ? 'text-terracotta-600'
                                                    : 'text-sunset-muted'
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-xl mb-0.5 ${suggestionCategory === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                                    }`}>
                                                    {cat.icon}
                                                </span>
                                                <span className={`text-[9px] font-bold ${suggestionCategory === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                                    }`}>
                                                    {cat.label}
                                                </span>
                                                {suggestionCategory === cat.id && (
                                                    <div className="w-1 h-1 bg-terracotta-500 rounded-full mt-0.5"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Nome do lugar</label>
                                    <input
                                        type="text"
                                        value={suggestionTitle}
                                        onChange={(e) => setSuggestionTitle(e.target.value)}
                                        placeholder="Ex: Airbnb com vista para o mar"
                                        className="w-full h-12 px-4 bg-white border border-terracotta-100 rounded-xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500 font-bold"
                                    />
                                </div>

                                {/* Image Upload */}
                                <div>
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">image</span>
                                        Foto do item
                                    </label>
                                    <ImageUpload
                                        currentImage={suggestionImageUrl}
                                        onImageChange={setSuggestionImageUrl}
                                        folder="items"
                                        aspectRatio={16 / 9}
                                        placeholder="Adicionar foto"
                                        className="h-32"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                            Localização
                                        </label>
                                        <input
                                            type="text"
                                            value={suggestionLocation}
                                            onChange={(e) => setSuggestionLocation(e.target.value)}
                                            placeholder="Ex: Centro"
                                            className="w-full h-12 px-4 bg-white border border-terracotta-100 rounded-xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">payments</span>
                                            Valor (R$)
                                        </label>
                                        <input
                                            type="number"
                                            value={suggestionPrice}
                                            onChange={(e) => setSuggestionPrice(e.target.value)}
                                            placeholder="0,00"
                                            className="w-full h-12 px-4 bg-white border border-terracotta-100 rounded-xl text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500 font-bold"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">link</span>
                                        Link (opcional)
                                    </label>
                                    <input
                                        type="url"
                                        value={suggestionLink}
                                        onChange={(e) => setSuggestionLink(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full h-12 px-4 bg-white border border-terracotta-100 rounded-xl text-xs text-sunset-dark placeholder:text-sunset-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                    />
                                </div>

                                {/* Expense Toggle */}
                                {suggestionStatus === 'confirmed' && suggestionPrice && (
                                    <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm space-y-4 animate-fade-in">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                                                    <span className="material-symbols-outlined text-sm">payments</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-sunset-dark">Lançar em Finanças?</p>
                                                    <p className="text-[9px] text-sunset-muted">Cria uma despesa automaticamente</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setSuggestionCreateExpense(!suggestionCreateExpense)}
                                                className={`w-10 h-5 rounded-full transition-all ${suggestionCreateExpense ? 'bg-emerald-500' : 'bg-terracotta-100'}`}
                                            >
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transition-transform ${suggestionCreateExpense ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                                            </button>
                                        </div>

                                        {suggestionCreateExpense && (
                                            <div className="pt-3 border-t border-terracotta-50">
                                                <label className="text-[9px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Quem pagou?</label>
                                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                                                    {selectedTrip?.participants.map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            onClick={() => setSuggestionPaidBy(p.id)}
                                                            className={`flex-shrink-0 flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all ${suggestionPaidBy === p.id ? 'bg-emerald-500 text-white shadow-md' : 'bg-warm-cream text-sunset-dark border border-terracotta-100'}`}
                                                        >
                                                            <img src={p.avatar} alt="" className="w-4 h-4 rounded-full object-cover" />
                                                            <span className="text-[10px] font-bold">{p.name.split(' ')[0]}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Notas Adicionais</label>
                                    <textarea
                                        value={suggestionDescription}
                                        onChange={(e) => setSuggestionDescription(e.target.value)}
                                        placeholder="Ex: Reserva confirmada no nome de Carol..."
                                        rows={3}
                                        className="w-full bg-white border border-terracotta-100 rounded-xl p-3 text-xs text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500 resize-none placeholder:text-sunset-muted/50"
                                    />
                                </div>

                                <button
                                    onClick={handleCreateSuggestion}
                                    disabled={!suggestionTitle.trim()}
                                    className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                    Adicionar ao Plano
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Cancel Button */}
                    <div className="px-6 mt-4">
                        <button
                            onClick={onClose}
                            className="w-full h-14 bg-terracotta-50 hover:bg-terracotta-100 text-sunset-dark font-semibold rounded-2xl transition-colors active:scale-95"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                @keyframes slideInRight {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideInUp {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
            `}</style>
        </>
    );
};

export default QuickActionsMenu;
