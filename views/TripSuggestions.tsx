// VERSION_TIMESTAMP: 2026-01-27T17:15:00
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MOCK_SUGGESTIONS } from '../constants';
import { storageService } from '../services/storageService';
import { Trip, Suggestion } from '../types';
import BottomNav from '../components/BottomNav';
import ImageUpload from '../components/ImageUpload';
import { DEFAULT_TRIP_IMAGE } from '../constants';

import Toast, { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingButton from '../components/LoadingButton';

type ViewMode = 'grid' | 'list';
type TabMode = 'confirmed' | 'suggestions';
type CategoryFilter = 'all' | 'bed' | 'directions_car' | 'explore' | 'restaurant' | 'more_horiz';

const TripSuggestions: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = React.useState<Trip | null>(null);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [activeTab, setActiveTab] = useState<TabMode>('confirmed');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
    const [settingsView, setSettingsView] = useState<'main' | 'edit' | 'photo' | 'notifications' | 'privacy'>('main');
    const [editFormData, setEditFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        imageUrl: '',
    });

    React.useEffect(() => {
        const loadTripData = async () => {
            if (id) {
                // Background loading handled by SWR
                const foundTrip = await storageService.getTripById(id);
                setTrip(foundTrip);
                if (foundTrip) {
                    setEditFormData({
                        title: foundTrip.title,
                        destination: foundTrip.destination,
                        startDate: foundTrip.startDate || '',
                        endDate: foundTrip.endDate || '',
                        imageUrl: foundTrip.imageUrl || '',
                    });
                }

                const storedSuggestions = await storageService.getSuggestionsByTrip(id);
                // Combine with mocks if it's trip ID 1 for demo purposes
                const allSuggestions = id === '1'
                    ? [...MOCK_SUGGESTIONS, ...storedSuggestions]
                    : storedSuggestions;

                setSuggestions(allSuggestions);

                // Check if current user is admin
                const adminStatus = await storageService.isAdmin(id);
                setIsAdmin(adminStatus);

                setIsLoading(false);
            }
        };
        loadTripData();
        return storageService.subscribe(loadTripData);
    }, [id]);

    const filteredSuggestions = suggestions.filter(s => {
        const tabMatch = s.status === (activeTab === 'confirmed' ? 'confirmed' : 'idea');
        if (!tabMatch) return false;

        if (categoryFilter === 'all') return true;

        // Map filter icon IDs to category names
        const categoryMap: Record<string, string> = {
            'bed': 'Hospedagem',
            'directions_car': 'Transporte',
            'explore': 'Passeios',
            'restaurant': 'Restaurantes',
            'more_horiz': 'Outros'
        };

        return s.category === categoryMap[categoryFilter];
    });

    const handleConfirmTrip = async () => {
        if (!trip || !id) return;
        setIsSubmitting(true);
        try {
            const updatedTrip = await storageService.updateTrip(id, { status: 'confirmed' });
            if (updatedTrip) {
                setTrip(updatedTrip);
                setShowConfirmModal(false);
                setToast({ message: 'Viagem confirmada com sucesso! 🎉', type: 'success' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTrip = async () => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            const success = await storageService.deleteTrip(id);
            if (success) {
                setToast({ message: 'Viagem excluída com sucesso.', type: 'info' });
                navigate('/dashboard');
            } else {
                setToast({ message: 'Erro ao excluir viagem.', type: 'error' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleConfirmSuggestion = async (suggestionId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Optimistic UI Update
        const previousSuggestions = [...suggestions];
        setSuggestions(prev => prev.map(s =>
            s.id === suggestionId ? { ...s, status: 'confirmed' } : s
        ));
        setToast({ message: 'Sugestão confirmada! ✨', type: 'success' });

        try {
            const updated = await storageService.updateSuggestion(suggestionId, { status: 'confirmed' });
            if (!updated) {
                throw new Error('Update failed');
            }
        } catch (error) {
            // Revert on error
            setSuggestions(previousSuggestions);
            setToast({ message: 'Erro ao confirmar sugestão. Revertendo...', type: 'error' });
        }
    };
    const [likedSuggestions, setLikedSuggestions] = useState<Set<string>>(new Set());
    const [showParticipantsModal, setShowParticipantsModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [showAddParticipantForm, setShowAddParticipantForm] = useState(false);
    const [newParticipantName, setNewParticipantName] = useState('');
    const [newParticipantAvatar, setNewParticipantAvatar] = useState('');
    const [showRemoveParticipantModal, setShowRemoveParticipantModal] = useState(false);
    const [participantToDelete, setParticipantToDelete] = useState<{ id: string, name: string } | null>(null);

    const handleAddParticipant = async () => {
        if (!id || !newParticipantName.trim()) return;
        setIsSubmitting(true);
        try {
            const avatar = newParticipantAvatar.trim() || `https://ui-avatars.com/api/?name=${encodeURIComponent(newParticipantName.trim())}&background=random`;
            const newParticipant = await storageService.addParticipantToTrip(id, {
                name: newParticipantName.trim(),
                avatar,
            });
            if (newParticipant) {
                // Refresh trip to get new participants list
                const foundTrip = await storageService.getTripById(id);
                setTrip(foundTrip);
                setNewParticipantName('');
                setNewParticipantAvatar('');
                setShowAddParticipantForm(false);
                setToast({ message: 'Participante adicionado! 👥', type: 'success' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!id || !trip) return;

        const participant = trip.participants.find(p => p.id === participantId);
        if (!participant) return;

        // 1. Check if participant has expenses
        const hasExpenses = trip.expenses?.some(e =>
            e.paidBy === participantId || e.participants?.includes(participantId)
        );

        if (hasExpenses) {
            setToast({
                message: `Não é possível remover ${participant.name}: existem gastos vinculados a esta pessoa. Mescle-a com outro participante primeiro.`,
                type: 'error'
            });
            return;
        }

        // 2. Check if participant has confirmed suggestions
        const hasConfirmedSuggestions = suggestions.some(s => s.confirmedBy === participantId);
        if (hasConfirmedSuggestions) {
            setToast({
                message: `Não é possível remover ${participant.name}: esta pessoa confirmou sugestões no roteiro. Mescle-a com outro participante primeiro.`,
                type: 'error'
            });
            return;
        }

        // 3. Open confirmation
        setParticipantToDelete({ id: participantId, name: participant.name });
        setShowRemoveParticipantModal(true);
    };

    const confirmRemoveParticipant = async () => {
        if (!id || !participantToDelete) return;

        setIsSubmitting(true);
        try {
            const result = await storageService.removeParticipantFromTrip(participantToDelete.id);
            if (result.success) {
                // Force a fresh fetch to ensure UI is in sync
                const foundTrip = await storageService.getTripById(id, true);
                setTrip(foundTrip);
                setShowRemoveParticipantModal(false);
                setParticipantToDelete(null);
                setToast({ message: 'Participante removido com sucesso.', type: 'info' });
            } else {
                setToast({ message: result.error || 'Erro ao remover participante.', type: 'error' });
            }
        } catch (error) {
            console.error('Error in participant removal:', error);
            setToast({ message: 'Erro ao processar a exclusão.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const [showAboutSection, setShowAboutSection] = useState(false);
    const [sharePrivacy, setSharePrivacy] = useState<'anyone' | 'invited'>(() => {
        if (id) {
            const saved = localStorage.getItem(`triip_share_privacy_${id}`);
            return (saved as 'anyone' | 'invited') || 'invited';
        }
        return 'invited';
    });

    const handlePrivacyChange = (privacy: 'anyone' | 'invited') => {
        setSharePrivacy(privacy);
        if (id) {
            localStorage.setItem(`triip_share_privacy_${id}`, privacy);
            setToast({ message: privacy === 'anyone' ? 'Qualquer pessoa com o link pode acessar' : 'Apenas convidados podem acessar', type: 'info' });
        }
    };

    const handleUpdateTrip = async () => {
        if (!trip || !id) return;

        setIsSubmitting(true);
        try {
            const updated = await storageService.updateTrip(id, {
                ...editFormData,
                dateRange: editFormData.startDate && editFormData.endDate
                    ? `${new Date(editFormData.startDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${new Date(editFormData.endDate + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`
                    : trip.dateRange
            });

            if (updated) {
                setTrip(updated);
                setSettingsView('main');
                setToast({ message: 'Atualizado com sucesso!', type: 'success' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePromoteToAdmin = async (participantId: string) => {
        if (!id) return;
        setIsSubmitting(true);
        try {
            const success = await storageService.updateParticipantRole(participantId, 'admin');
            if (success) {
                const foundTrip = await storageService.getTripById(id, true);
                setTrip(foundTrip);
                setToast({ message: 'Participante promovido a Administrador! 🛡️', type: 'success' });
            } else {
                setToast({ message: 'Erro ao promover participante.', type: 'error' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-warm-cream flex flex-col items-center justify-center p-6 text-center">
                <div className="w-12 h-12 border-4 border-terracotta-200 border-t-terracotta-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sunset-dark font-bold">Carregando detalhes da viagem...</p>
            </div>
        );
    }

    if (!trip && !isSubmitting) {
        return (
            <div className="min-h-screen bg-warm-cream flex flex-col items-center justify-center p-6 text-center">
                <span className="material-symbols-outlined text-6xl text-terracotta-300 mb-4">search_off</span>
                <h3 className="text-xl font-bold text-sunset-dark mb-2">Viagem não encontrada</h3>
                <p className="text-sunset-muted mb-6">Não conseguimos localizar a viagem solicitada.</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-3 bg-terracotta-500 text-white font-bold rounded-xl shadow-lg shadow-terracotta-500/30"
                >
                    Voltar para o Dashboard
                </button>
            </div>
        );
    }

    const handleShareWhatsApp = () => {
        const tripUrl = `${window.location.origin}/#/join/${id}`;
        const message = `Confira essa viagem incrível: ${trip.title}!\n${tripUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopyLink = () => {
        const tripUrl = `${window.location.origin}/#/join/${id}`;
        navigator.clipboard.writeText(tripUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const toggleLike = (suggestionId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setLikedSuggestions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(suggestionId)) {
                newSet.delete(suggestionId);
            } else {
                newSet.add(suggestionId);
            }
            return newSet;
        });
    };

    const categories = [
        { id: 'all' as CategoryFilter, icon: 'grid_view', label: 'Todas' },
        { id: 'bed' as CategoryFilter, icon: 'bed', label: 'Hospedagem' },
        { id: 'directions_car' as CategoryFilter, icon: 'flight', label: 'Transporte' },
        { id: 'explore' as CategoryFilter, icon: 'confirmation_number', label: 'Passeios' },
        { id: 'restaurant' as CategoryFilter, icon: 'restaurant', label: 'Restaurantes' },
        { id: 'more_horiz' as CategoryFilter, icon: 'shopping_bag', label: 'Outros' },
    ];

    return (
        <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            {/* Remove Participant Confirm Modal */}
            <ConfirmModal
                isOpen={showRemoveParticipantModal}
                title="Remover Participante?"
                message={`Deseja realmente remover ${participantToDelete?.name}? Todos os registros individuais vinculados a esta pessoa serão perdidos e ela não aparecerá mais nos cálculos da viagem.`}
                confirmLabel="Remover Agora"
                onConfirm={confirmRemoveParticipant}
                onCancel={() => { setShowRemoveParticipantModal(false); setParticipantToDelete(null); }}
                isLoading={isSubmitting}
            />

            {/* Confirm Modal */}
            <ConfirmModal
                isOpen={showConfirmModal}
                title="Confirmar Viagem?"
                message="Ao confirmar, esta viagem se tornará oficial e poderá ser compartilhada com os participantes."
                confirmText="Sim, Confirmar"
                cancelText="Cancelar"
                onConfirm={handleConfirmTrip}
                onCancel={() => setShowConfirmModal(false)}
                type="info"
                isLoading={isSubmitting}
            />

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Excluir Viagem?"
                message="Tem certeza que deseja apagar esta viagem permanentemente? Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                onConfirm={handleDeleteTrip}
                onCancel={() => setShowDeleteModal(false)}
                type="danger"
                isLoading={isSubmitting}
            />

            {/* Header */}
            <header className="sticky top-0 z-40 bg-warm-cream/95 backdrop-blur-md px-5 pt-14 pb-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm"
                            aria-label="Voltar"
                        >
                            <span className="material-symbols-outlined text-sunset-dark text-2xl">arrow_back</span>
                        </button>
                        <div className="flex flex-col">
                            <h1 className="text-xl font-bold tracking-tight">{trip.title}</h1>
                            <div className="flex items-center gap-2 mt-0.5">
                                {trip.status === 'draft' ? (
                                    <span className="bg-amber-500 text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Rascunho</span>
                                ) : trip.status === 'past' ? (
                                    <span className="bg-sunset-muted text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Passada</span>
                                ) : (
                                    <span className="bg-emerald-500 text-[9px] text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Confirmada</span>
                                )}
                                <span className="text-[10px] text-sunset-muted font-medium flex items-center gap-0.5">
                                    <span className="material-symbols-outlined text-[10px]">location_on</span>
                                    {trip.destination}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Participants Pill - Compact View */}
                        <button
                            onClick={() => setShowParticipantsModal(true)}
                            className="flex items-center gap-2 p-1 pr-3 bg-white border border-terracotta-100 rounded-full shadow-sm active:scale-95 transition-transform flex-shrink-0 h-9"
                        >
                            {trip.participants?.[0] && (
                                <img
                                    src={typeof trip.participants[0] === 'string' ? trip.participants[0] : trip.participants[0].avatar}
                                    alt="Dono"
                                    className="w-7 h-7 rounded-full object-cover shadow-sm bg-terracotta-50"
                                />
                            )}
                            <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-base text-terracotta-500 fill">group</span>
                                <span className="text-xs font-black text-sunset-dark">{trip.participants?.length || 1}</span>
                            </div>
                        </button>

                        {/* View Mode Toggle */}
                        <div className="flex items-center p-1 bg-terracotta-100/40 rounded-full h-10">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`w-8 h-8 flex items-center justify-center rounded-full ${viewMode === 'grid' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'}`}
                            >
                                <span className={`material-symbols-outlined text-xl ${viewMode === 'grid' ? 'fill' : ''}`}>grid_view</span>
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`w-8 h-8 flex items-center justify-center rounded-full ${viewMode === 'list' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'}`}
                            >
                                <span className={`material-symbols-outlined text-xl ${viewMode === 'list' ? 'fill' : ''}`}>format_list_bulleted</span>
                            </button>
                        </div>

                        {/* Share Trip Button (Admin Only) */}
                        {isAdmin && (
                            <button
                                onClick={() => trip.status === 'draft' ? setToast({ message: 'Confirme a viagem para compartilhar', type: 'warning' }) : setShowShareModal(true)}
                                className={`w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm active:scale-95 transition-transform ${trip.status === 'draft' ? 'opacity-50' : ''}`}
                            >
                                <span className="material-symbols-outlined text-sunset-dark text-2xl">share</span>
                            </button>
                        )}

                        {/* Settings Button (Admin Only for core settings, but everyone might need notifications) */}
                        {/* We'll show for everyone but filter options inside */}
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-sunset-dark text-2xl">settings</span>
                        </button>
                    </div>
                </div>

                {/* Tabs and Finance Button */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="flex-1 flex p-1 bg-terracotta-100/40 rounded-2xl">
                        <button
                            onClick={() => setActiveTab('confirmed')}
                            className={`flex-[1.4] py-2.5 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${activeTab === 'confirmed' ? 'bg-white text-terracotta-600 shadow-sm ring-1 ring-terracotta-100' : 'text-sunset-muted'}`}
                        >
                            <span className={`material-symbols-outlined text-lg ${activeTab === 'confirmed' ? 'fill' : ''}`}>check_circle</span>
                            Confirmados
                        </button>
                        <button
                            onClick={() => setActiveTab('suggestions')}
                            className={`flex-1 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${activeTab === 'suggestions' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted/70'}`}
                        >
                            <span className={`material-symbols-outlined text-base ${activeTab === 'suggestions' ? 'fill' : ''}`}>lightbulb</span>
                            Ideias
                        </button>
                    </div>

                    {/* Finance Button */}
                    <button
                        onClick={() => navigate(`/finance/${id}`)}
                        className="flex items-center gap-2 px-4 py-2 bg-terracotta-500 text-white rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-lg">payments</span>
                        <span className="text-sm font-bold whitespace-nowrap text-xs">Contas</span>
                    </button>
                </div>

                {/* Draft Banner */}
                {
                    trip.status === 'draft' && (
                        <div className="mb-4 animate-fade-in">
                            <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-2xl p-4 border border-amber-200/50 shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-amber-600">info</span>
                                    <div>
                                        <h3 className="text-xs font-bold text-sunset-dark">Viagem em Rascunho</h3>
                                        <p className="text-[10px] text-sunset-muted">Confirme para liberar o compartilhamento.</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => navigate(`/edit-trip/${id}`)}
                                        className="h-8 px-3 bg-white border border-amber-200 text-amber-700 text-[10px] font-bold rounded-lg active:scale-95 transition-all"
                                    >
                                        Editar
                                    </button>
                                    <LoadingButton
                                        onClick={() => setShowConfirmModal(true)}
                                        className="h-8 px-3 bg-amber-500 text-white text-[10px] font-bold rounded-lg shadow-sm shadow-amber-200"
                                    >
                                        Confirmar
                                    </LoadingButton>
                                </div>
                            </div>
                        </div>
                    )
                }

                {/* About/Summary Section - Click to go to full page */}
                <button
                    onClick={() => navigate(`/trip/${id}/about`)}
                    className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-terracotta-100 shadow-sm active:scale-[0.99] transition-all mb-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-terracotta-50 rounded-xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-terracotta-500">info</span>
                        </div>
                        <div className="text-left">
                            <h3 className="font-bold text-sunset-dark text-sm">Sobre a Viagem</h3>
                            <p className="text-[10px] text-sunset-muted">{trip.destination} • {trip.dateRange}</p>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-sunset-muted">chevron_right</span>
                </button>

                {/* Past Trip Banner */}
                {
                    trip.status === 'past' && (
                        <div className="mb-4 animate-fade-in">
                            <div className="bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-2xl p-4 border border-slate-200/50 shadow-sm flex items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-slate-500">history</span>
                                    <div>
                                        <h3 className="text-xs font-bold text-slate-700">Memórias da Viagem</h3>
                                        <p className="text-[10px] text-slate-500">Esta viagem já aconteceu em {new Date(trip.startDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate(`/edit-trip/${id}`)}
                                    className="h-8 px-3 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold rounded-lg active:scale-95 transition-all"
                                >
                                    Ver Detalhes
                                </button>
                            </div>
                        </div>
                    )
                }

                {/* Category Filters - Grid Style */}
                <div className="grid grid-cols-6 gap-1">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setCategoryFilter(cat.id)}
                            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${categoryFilter === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                }`}
                        >
                            <span className={`material-symbols-outlined text-xl mb-0.5 ${categoryFilter === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                }`}>
                                {cat.icon}
                            </span>
                            <span className={`text-[9px] font-bold ${categoryFilter === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                }`}>
                                {cat.label}
                            </span>
                            {categoryFilter === cat.id && (
                                <div className="w-1 h-1 bg-terracotta-500 rounded-full mt-0.5"></div>
                            )}
                        </button>
                    ))}
                </div>

                {/* Add Item Button (Dashed style like Finance) */}
                <button
                    onClick={() => navigate(`/trip/${id}/add-suggestion`)}
                    className="w-full h-14 mt-4 bg-terracotta-50/50 border-2 border-dashed border-terracotta-200 rounded-2xl flex items-center justify-center gap-2 text-terracotta-500 font-bold active:scale-[0.98] transition-all"
                >
                    <span className="material-symbols-outlined">add</span>
                    Adicionar Item
                </button>
            </header>

            {/* Main Content */}
            <main className="flex-1 px-5 mt-4 space-y-4">
                {activeTab === 'confirmed' ? (
                    viewMode === 'grid' ? (
                        // Grid View - Confirmed
                        <div className="space-y-6">
                            {filteredSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    onClick={() => navigate(`/trip/${id}/suggestion/${suggestion.id}`)}
                                    className="bg-white rounded-[32px] p-2.5 border-[1.5px] border-white shadow-[0_4px_20px_-2px_rgba(74,55,51,0.05)] cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[24px]">
                                        <img
                                            alt={suggestion.title}
                                            className="w-full h-full object-cover"
                                            src={suggestion.imageUrl || DEFAULT_TRIP_IMAGE}
                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                        />
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 text-white">
                                            <span className="material-symbols-outlined text-lg fill">check_circle</span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-lg border border-white/20 text-white text-[11px] font-semibold">
                                            {suggestion.price}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 px-2 pt-3 pb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-terracotta-500">{suggestion.category}</span>
                                                <span className="text-[10px] text-sunset-muted font-medium">• {suggestion.location}</span>
                                            </div>
                                            <h3 className="text-base font-bold text-sunset-dark truncate">{suggestion.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => toggleLike(suggestion.id, e)}
                                                className={`w-10 h-10 flex items-center justify-center rounded-full border active:scale-95 transition-all ${likedSuggestions.has(suggestion.id)
                                                    ? 'border-red-200 bg-red-50 text-red-500'
                                                    : 'border-terracotta-100 bg-white text-terracotta-600'
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-xl ${likedSuggestions.has(suggestion.id) ? 'fill' : ''}`}>favorite</span>
                                            </button>
                                            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-terracotta-100 text-terracotta-600 bg-white active:scale-95 transition-transform">
                                                <span className="material-symbols-outlined text-xl">share</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // List View - Confirmed
                        <div className="space-y-4">
                            {filteredSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    onClick={() => navigate(`/trip/${id}/suggestion/${suggestion.id}`)}
                                    className="bg-white rounded-[24px] p-2 flex gap-3 border-[1.5px] border-white shadow-[0_4px_20px_-2px_rgba(74,55,51,0.05)] cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-[18px]">
                                        <img
                                            alt={suggestion.title}
                                            className="w-full h-full object-cover"
                                            src={suggestion.imageUrl || DEFAULT_TRIP_IMAGE}
                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                        />
                                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 text-white">
                                            <span className="material-symbols-outlined text-sm fill">check_circle</span>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/45 backdrop-blur-lg border border-white/20 text-white text-[9px] font-semibold">
                                            {suggestion.price}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[9px] uppercase tracking-wider font-bold text-terracotta-500">{suggestion.category}</span>
                                                <span className="text-[9px] text-sunset-muted font-medium">• {suggestion.location}</span>
                                            </div>
                                            <h3 className="text-sm font-bold text-sunset-dark line-clamp-1">{suggestion.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => toggleLike(suggestion.id, e)}
                                                className={`w-9 h-9 flex items-center justify-center rounded-full border active:scale-95 transition-all ${likedSuggestions.has(suggestion.id)
                                                    ? 'border-red-200 bg-red-50 text-red-500'
                                                    : 'border-terracotta-100 bg-white text-terracotta-600'
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-lg ${likedSuggestions.has(suggestion.id) ? 'fill' : ''}`}>favorite</span>
                                            </button>
                                            <button className="w-9 h-9 flex items-center justify-center rounded-full border border-terracotta-100 text-terracotta-600 bg-white active:scale-95 transition-transform">
                                                <span className="material-symbols-outlined text-lg">share</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    // Suggestions/Ideas Tab
                    viewMode === 'grid' ? (
                        // Grid View - Ideas
                        <div className="space-y-6">
                            {filteredSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    onClick={() => navigate(`/trip/${id}/suggestion/${suggestion.id}`)}
                                    className="bg-white rounded-[32px] p-2.5 border-[1.5px] border-white shadow-[0_4px_20px_-2px_rgba(74,55,51,0.05)] cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[24px]">
                                        <img
                                            alt={suggestion.title}
                                            className="w-full h-full object-cover"
                                            src={suggestion.imageUrl || DEFAULT_TRIP_IMAGE}
                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                        />
                                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 text-white">
                                            <span className="material-symbols-outlined text-lg fill">favorite</span>
                                            <span className="text-xs font-bold">12</span>
                                        </div>
                                        <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-lg border border-white/20 text-white text-[11px] font-semibold">
                                            {suggestion.price}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 px-2 pt-3 pb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[10px] uppercase tracking-widest font-bold text-terracotta-500">{suggestion.category}</span>
                                                <span className="text-[10px] text-sunset-muted font-medium">• {suggestion.location}</span>
                                            </div>
                                            <h3 className="text-base font-bold text-sunset-dark truncate">{suggestion.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => toggleLike(suggestion.id, e)}
                                                className={`w-10 h-10 flex items-center justify-center rounded-full border active:scale-95 transition-all ${likedSuggestions.has(suggestion.id)
                                                    ? 'border-red-200 bg-red-50 text-red-500'
                                                    : 'border-terracotta-100 bg-white text-terracotta-600'
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-xl ${likedSuggestions.has(suggestion.id) ? 'fill' : ''}`}>favorite</span>
                                            </button>
                                            <button className="w-10 h-10 flex items-center justify-center rounded-full border border-terracotta-100 text-terracotta-600 bg-white active:scale-95 transition-transform">
                                                <span className="material-symbols-outlined text-xl">share</span>
                                            </button>
                                            <button
                                                onClick={(e) => handleConfirmSuggestion(suggestion.id, e)}
                                                className="flex items-center justify-center gap-2 bg-terracotta-600 text-white px-4 h-10 rounded-full shadow-lg shadow-terracotta-100/50 active:scale-95 transition-transform"
                                            >
                                                <span className="text-xs font-bold">Confirmar</span>
                                                <span className="material-symbols-outlined text-base font-bold">check_circle</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // List View - Ideas
                        <div className="space-y-4">
                            {filteredSuggestions.map((suggestion) => (
                                <div
                                    key={suggestion.id}
                                    onClick={() => navigate(`/trip/${id}/suggestion/${suggestion.id}`)}
                                    className="bg-white rounded-[24px] p-2 flex gap-3 border-[1.5px] border-white shadow-[0_4px_20px_-2px_rgba(74,55,51,0.05)] cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <div className="relative w-32 h-32 flex-shrink-0 overflow-hidden rounded-[18px]">
                                        <img
                                            alt={suggestion.title}
                                            className="w-full h-full object-cover"
                                            src={suggestion.imageUrl || DEFAULT_TRIP_IMAGE}
                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                        />
                                        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-white/25 backdrop-blur-xl border border-white/40 text-white">
                                            <span className="material-symbols-outlined text-sm fill">favorite</span>
                                            <span className="text-[10px] font-bold">12</span>
                                        </div>
                                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-black/45 backdrop-blur-lg border border-white/20 text-white text-[9px] font-semibold">
                                            {suggestion.price}
                                        </div>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-1 pr-1">
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="text-[9px] uppercase tracking-wider font-bold text-terracotta-500">{suggestion.category}</span>
                                                <span className="text-[9px] text-sunset-muted font-medium">• {suggestion.location}</span>
                                            </div>
                                            <h3 className="text-sm font-bold text-sunset-dark line-clamp-1">{suggestion.title}</h3>
                                        </div>
                                        <div className="flex items-center gap-2 mt-auto" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => toggleLike(suggestion.id, e)}
                                                className={`w-9 h-9 flex items-center justify-center rounded-full border active:scale-95 transition-all ${likedSuggestions.has(suggestion.id)
                                                    ? 'border-red-200 bg-red-50 text-red-500'
                                                    : 'border-terracotta-100 bg-white text-terracotta-600'
                                                    }`}
                                            >
                                                <span className={`material-symbols-outlined text-lg ${likedSuggestions.has(suggestion.id) ? 'fill' : ''}`}>favorite</span>
                                            </button>
                                            <button className="w-9 h-9 flex items-center justify-center rounded-full border border-terracotta-100 text-terracotta-600 bg-white active:scale-95 transition-transform">
                                                <span className="material-symbols-outlined text-lg">share</span>
                                            </button>
                                            <button
                                                onClick={(e) => handleConfirmSuggestion(suggestion.id, e)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-terracotta-600 text-white h-9 rounded-full shadow-md shadow-terracotta-100 active:scale-95 transition-transform"
                                            >
                                                <span className="text-[11px] font-bold">Confirmar</span>
                                                <span className="material-symbols-outlined text-sm font-bold">check_circle</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </main >

            <BottomNav />

            {/* Participants Management Modal */}
            {
                showParticipantsModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                        {/* Backdrop */}
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => { setShowParticipantsModal(false); setShowAddParticipantForm(false); }}
                        ></div>

                        {/* Modal Content */}
                        <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[80vh] overflow-hidden animate-slide-up">
                            {/* Header */}
                            <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold">Participantes da Viagem</h2>
                                    <button
                                        onClick={() => { setShowParticipantsModal(false); setShowAddParticipantForm(false); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600 active:scale-95 transition-transform"
                                    >
                                        <span className="material-symbols-outlined text-xl">close</span>
                                    </button>
                                </div>
                                <p className="text-sm text-sunset-muted mt-1">{trip.participants?.length || 0} pessoas nesta viagem</p>
                            </div>

                            {/* Participants List */}
                            <div className="overflow-y-auto max-h-[calc(80vh-200px)] px-6 py-4">
                                <div className="space-y-3">
                                    {trip.participants && trip.participants.map((participant) => (
                                        <div key={participant.id} className="flex items-center justify-between p-3 bg-warm-cream rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={participant.avatar}
                                                    alt={participant.name}
                                                    className="w-12 h-12 rounded-full border-2 border-white shadow-sm object-cover"
                                                />
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <p className="font-bold text-sunset-dark">{participant.name}</p>
                                                        {participant.role === 'admin' && (
                                                            <span className="px-1.5 py-0.5 rounded-md bg-terracotta-100 text-terracotta-600 text-[10px] font-bold uppercase tracking-wider">
                                                                Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-sunset-muted">
                                                        {participant.role === 'admin' ? 'Administrador da viagem' : 'Membro da viagem'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isAdmin && participant.role === 'member' && (
                                                    <button
                                                        onClick={() => handlePromoteToAdmin(participant.id)}
                                                        title="Promover a Administrador"
                                                        className="w-9 h-9 flex items-center justify-center rounded-full border border-terracotta-100 text-terracotta-600 active:scale-95 transition-transform hover:bg-terracotta-50"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">shield_person</span>
                                                    </button>
                                                )}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleRemoveParticipant(participant.id)}
                                                        title="Remover Participante"
                                                        className="w-9 h-9 flex items-center justify-center rounded-full border border-red-200 text-red-500 active:scale-95 transition-transform hover:bg-red-50"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">person_remove</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!trip.participants || trip.participants.length === 0) && (
                                        <div className="flex flex-col items-center justify-center py-8 text-center text-sunset-muted">
                                            <span className="material-symbols-outlined text-4xl opacity-30 mb-2">group_off</span>
                                            <p className="text-sm">Nenhum participante ainda.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Add Participant Form or Button (Admin Only) */}
                            {isAdmin && (
                                <div className="sticky bottom-0 bg-white border-t border-terracotta-100 px-6 py-4">
                                    {showAddParticipantForm ? (
                                        <div className="space-y-3">
                                            <input
                                                type="text"
                                                value={newParticipantName}
                                                onChange={(e) => setNewParticipantName(e.target.value)}
                                                placeholder="Nome do participante *"
                                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl focus:ring-2 focus:ring-terracotta-400 outline-none transition-all"
                                            />
                                            <input
                                                type="text"
                                                value={newParticipantAvatar}
                                                onChange={(e) => setNewParticipantAvatar(e.target.value)}
                                                placeholder="URL da foto (opcional)"
                                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl focus:ring-2 focus:ring-terracotta-400 outline-none transition-all"
                                            />
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowAddParticipantForm(false)}
                                                    className="flex-1 h-12 bg-white border border-terracotta-100 text-sunset-muted font-bold rounded-xl active:scale-95 transition-all"
                                                >
                                                    Cancelar
                                                </button>
                                                <LoadingButton
                                                    onClick={handleAddParticipant}
                                                    isLoading={isSubmitting}
                                                    loadingText="Adicionando..."
                                                    disabled={!newParticipantName.trim()}
                                                    className="flex-[2] h-12 bg-terracotta-500 text-white font-bold rounded-xl shadow-lg shadow-terracotta-500/30"
                                                >
                                                    <span className="material-symbols-outlined">check</span>
                                                    <span>Adicionar</span>
                                                </LoadingButton>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setShowAddParticipantForm(true)}
                                            className="w-full h-12 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined">person_add</span>
                                            <span>Adicionar Participante</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Share Trip Modal with Privacy Options */}
            {
                showShareModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => setShowShareModal(false)}
                        ></div>

                        <div className="relative w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-slide-up">
                            <div className="px-6 py-4 border-b border-terracotta-100">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-bold">Compartilhar Viagem</h2>
                                    <button
                                        onClick={() => setShowShareModal(false)}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600 active:scale-95 transition-transform"
                                    >
                                        <span className="material-symbols-outlined text-xl">close</span>
                                    </button>
                                </div>
                                <p className="text-sm text-sunset-muted mt-1">Defina quem pode acessar esta viagem</p>
                            </div>

                            {/* Privacy Options */}
                            <div className="px-6 py-4 border-b border-terracotta-50">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sunset-muted mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">lock</span>
                                    Acesso à Viagem
                                </p>
                                <div className="space-y-2">
                                    <button
                                        onClick={() => handlePrivacyChange('anyone')}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sharePrivacy === 'anyone'
                                            ? 'border-terracotta-500 bg-terracotta-50'
                                            : 'border-terracotta-100 bg-white hover:border-terracotta-200'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sharePrivacy === 'anyone' ? 'bg-terracotta-500 text-white' : 'bg-terracotta-100 text-terracotta-500'
                                            }`}>
                                            <span className="material-symbols-outlined">public</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-sunset-dark">Qualquer pessoa com o link</p>
                                            <p className="text-[10px] text-sunset-muted">Qualquer pessoa pode visualizar e participar</p>
                                        </div>
                                        {sharePrivacy === 'anyone' && (
                                            <span className="material-symbols-outlined text-terracotta-500 fill">check_circle</span>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => handlePrivacyChange('invited')}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sharePrivacy === 'invited'
                                            ? 'border-terracotta-500 bg-terracotta-50'
                                            : 'border-terracotta-100 bg-white hover:border-terracotta-200'
                                            }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sharePrivacy === 'invited' ? 'bg-terracotta-500 text-white' : 'bg-terracotta-100 text-terracotta-500'
                                            }`}>
                                            <span className="material-symbols-outlined">group</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-sunset-dark">Apenas convidados</p>
                                            <p className="text-[10px] text-sunset-muted">Somente participantes adicionados</p>
                                        </div>
                                        {sharePrivacy === 'invited' && (
                                            <span className="material-symbols-outlined text-terracotta-500 fill">check_circle</span>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Share Actions */}
                            <div className="px-6 py-4 space-y-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-sunset-muted mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">share</span>
                                    Compartilhar via
                                </p>
                                <button
                                    onClick={handleShareWhatsApp}
                                    className="w-full flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-2xl active:scale-[0.98] transition-transform"
                                >
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-2xl">chat</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-green-900">WhatsApp</p>
                                        <p className="text-[10px] text-green-700">Enviar link da viagem</p>
                                    </div>
                                    <span className="material-symbols-outlined text-green-600">chevron_right</span>
                                </button>

                                <button
                                    onClick={handleCopyLink}
                                    className="w-full flex items-center gap-4 p-4 bg-terracotta-50 border border-terracotta-200 rounded-2xl active:scale-[0.98] transition-transform"
                                >
                                    <div className="w-12 h-12 bg-terracotta-500 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-2xl">
                                            {linkCopied ? 'check' : 'link'}
                                        </span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-bold text-terracotta-900">
                                            {linkCopied ? 'Link Copiado!' : 'Copiar Link'}
                                        </p>
                                        <p className="text-[10px] text-terracotta-700">
                                            {linkCopied ? 'Cole onde quiser' : 'Copiar para área de transferência'}
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-terracotta-600">
                                        {linkCopied ? 'check_circle' : 'content_copy'}
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Settings Modal */}
            {
                showSettingsModal && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                        <div
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            onClick={() => { setShowSettingsModal(false); setSettingsView('main'); }}
                        ></div>

                        <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-hidden animate-slide-up">
                            {/* Modal Header */}
                            <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4 z-10">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {settingsView !== 'main' && (
                                            <button
                                                onClick={() => setSettingsView('main')}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-terracotta-50 text-terracotta-600"
                                            >
                                                <span className="material-symbols-outlined text-xl">arrow_back</span>
                                            </button>
                                        )}
                                        <h2 className="text-xl font-bold">
                                            {settingsView === 'main' && 'Configurações'}
                                            {settingsView === 'edit' && 'Editar Informações'}
                                            {settingsView === 'photo' && 'Alterar Foto'}
                                            {settingsView === 'notifications' && 'Notificações'}
                                            {settingsView === 'privacy' && 'Privacidade'}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={() => { setShowSettingsModal(false); setSettingsView('main'); }}
                                        className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600 active:scale-95 transition-transform"
                                    >
                                        <span className="material-symbols-outlined text-xl">close</span>
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-y-auto max-h-[calc(85vh-80px)] px-6 py-6 pb-12">
                                {/* MAIN MENU */}
                                {settingsView === 'main' && (
                                    <div className="space-y-3">
                                        {isAdmin && (
                                            <>
                                                <button
                                                    onClick={() => setSettingsView('edit')}
                                                    className="w-full flex items-center justify-between p-4 bg-warm-cream rounded-2xl active:scale-[0.98] transition-transform"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-terracotta-100 rounded-full flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-terracotta-600">edit</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-sunset-dark">Editar Informações</p>
                                                            <p className="text-xs text-sunset-muted">Nome, datas e destino</p>
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-sunset-muted">chevron_right</span>
                                                </button>

                                                <button
                                                    onClick={() => setSettingsView('photo')}
                                                    className="w-full flex items-center justify-between p-4 bg-warm-cream rounded-2xl active:scale-[0.98] transition-transform"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-blue-600">image</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-sunset-dark">Alterar Foto de Capa</p>
                                                            <p className="text-xs text-sunset-muted">Escolher nova imagem</p>
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-sunset-muted">chevron_right</span>
                                                </button>
                                            </>
                                        )}

                                        <button
                                            onClick={() => setSettingsView('notifications')}
                                            className="w-full flex items-center justify-between p-4 bg-warm-cream rounded-2xl active:scale-[0.98] transition-transform"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-purple-600">notifications</span>
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-bold text-sunset-dark">Notificações</p>
                                                    <p className="text-xs text-sunset-muted">Gerenciar alertas da viagem</p>
                                                </div>
                                            </div>
                                            <span className="material-symbols-outlined text-sunset-muted">chevron_right</span>
                                        </button>

                                        {isAdmin && (
                                            <button
                                                onClick={() => setSettingsView('privacy')}
                                                className="w-full flex items-center justify-between p-4 bg-warm-cream rounded-2xl active:scale-[0.98] transition-transform"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-orange-600">lock</span>
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-sunset-dark">Privacidade</p>
                                                        <p className="text-xs text-sunset-muted">Quem pode ver e participar</p>
                                                    </div>
                                                </div>
                                                <span className="material-symbols-outlined text-sunset-muted">chevron_right</span>
                                            </button>
                                        )}

                                        {isAdmin && (
                                            <div className="pt-4 border-t border-terracotta-100">
                                                <button
                                                    onClick={() => { setShowSettingsModal(false); setShowDeleteModal(true); }}
                                                    className="w-full flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-2xl active:scale-[0.98] transition-transform"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-red-600">delete</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-bold text-red-600">Excluir Viagem</p>
                                                            <p className="text-xs text-red-500">Ação permanente</p>
                                                        </div>
                                                    </div>
                                                    <span className="material-symbols-outlined text-red-500">chevron_right</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* EDIT INFO VIEW */}
                                {settingsView === 'edit' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div>
                                            <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Nome da Viagem</label>
                                            <input
                                                type="text"
                                                value={editFormData.title}
                                                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl focus:ring-2 focus:ring-terracotta-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Destino</label>
                                            <input
                                                type="text"
                                                value={editFormData.destination}
                                                onChange={(e) => setEditFormData({ ...editFormData, destination: e.target.value })}
                                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl focus:ring-2 focus:ring-terracotta-500 outline-none transition-all"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-1">Início</label>
                                                <input
                                                    type="date"
                                                    value={editFormData.startDate}
                                                    onChange={(e) => setEditFormData({ ...editFormData, startDate: e.target.value })}
                                                    className="w-full h-10 px-3 bg-warm-cream border border-terracotta-100 rounded-lg text-xs"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-1">Fim</label>
                                                <input
                                                    type="date"
                                                    value={editFormData.endDate}
                                                    onChange={(e) => setEditFormData({ ...editFormData, endDate: e.target.value })}
                                                    className="w-full h-10 px-3 bg-warm-cream border border-terracotta-100 rounded-lg text-xs"
                                                />
                                            </div>
                                        </div>
                                        <LoadingButton
                                            onClick={handleUpdateTrip}
                                            isLoading={isSubmitting}
                                            loadingText="Salvando..."
                                            className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg mt-4"
                                        >
                                            Salvar Alterações
                                        </LoadingButton>
                                    </div>
                                )}

                                {/* PHOTO VIEW */}
                                {settingsView === 'photo' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <ImageUpload
                                            currentImage={editFormData.imageUrl || DEFAULT_TRIP_IMAGE}
                                            onImageChange={(url) => {
                                                setEditFormData({ ...editFormData, imageUrl: url });
                                            }}
                                            folder="trips"
                                            aspectRatio={16 / 9}
                                            placeholder="Selecionar foto de capa"
                                            className="h-48"
                                        />
                                        <LoadingButton
                                            onClick={handleUpdateTrip}
                                            isLoading={isSubmitting}
                                            loadingText="Salvando..."
                                            className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg mt-2"
                                        >
                                            Confirmar Nova Foto
                                        </LoadingButton>
                                    </div>
                                )}

                                {/* NOTIFICATIONS VIEW */}
                                {settingsView === 'notifications' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="space-y-3">
                                            {[
                                                { label: 'Novos Comentários', desc: 'Alertar quando alguém comentar', icon: 'forum' },
                                                { label: 'Novas Sugestões', desc: 'Quando alguém sugerir um lugar', icon: 'explore' },
                                                { label: 'Despesas', desc: 'Quando uma nova conta for aberta', icon: 'payments' },
                                                { label: 'Lembretes', desc: 'Alertas de datas e prazos', icon: 'alarm' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex items-center justify-between p-4 bg-warm-cream rounded-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-terracotta-500">{item.icon}</span>
                                                        <div className="text-left">
                                                            <p className="font-bold text-sunset-dark text-sm">{item.label}</p>
                                                            <p className="text-[10px] text-sunset-muted">{item.desc}</p>
                                                        </div>
                                                    </div>
                                                    <div className="w-12 h-6 bg-terracotta-500 rounded-full relative p-1 cursor-pointer">
                                                        <div className="w-4 h-4 bg-white rounded-full translate-x-6" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setSettingsView('main')}
                                            className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg mt-4"
                                        >
                                            Concluído
                                        </button>
                                    </div>
                                )}

                                {/* PRIVACY VIEW */}
                                {settingsView === 'privacy' && (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="space-y-3">
                                            <button
                                                onClick={() => handlePrivacyChange('anyone')}
                                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sharePrivacy === 'anyone'
                                                    ? 'border-terracotta-500 bg-terracotta-50'
                                                    : 'border-terracotta-100 bg-white'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sharePrivacy === 'anyone' ? 'bg-terracotta-500 text-white' : 'bg-terracotta-100 text-terracotta-500'
                                                    }`}>
                                                    <span className="material-symbols-outlined">public</span>
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-bold text-sunset-dark">Qualquer pessoa</p>
                                                    <p className="text-[10px] text-sunset-muted">Quem tiver o link pode ver e participar</p>
                                                </div>
                                                {sharePrivacy === 'anyone' && <span className="material-symbols-outlined text-terracotta-500 fill">check_circle</span>}
                                            </button>

                                            <button
                                                onClick={() => handlePrivacyChange('invited')}
                                                className={`w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${sharePrivacy === 'invited'
                                                    ? 'border-terracotta-500 bg-terracotta-50'
                                                    : 'border-terracotta-100 bg-white'
                                                    }`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${sharePrivacy === 'invited' ? 'bg-terracotta-500 text-white' : 'bg-terracotta-100 text-terracotta-500'
                                                    }`}>
                                                    <span className="material-symbols-outlined">group</span>
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-bold text-sunset-dark">Apenas convidados</p>
                                                    <p className="text-[10px] text-sunset-muted">Somente pessoas adicionadas por você</p>
                                                </div>
                                                {sharePrivacy === 'invited' && <span className="material-symbols-outlined text-terracotta-500 fill">check_circle</span>}
                                            </button>
                                        </div>
                                        <button
                                            onClick={() => setSettingsView('main')}
                                            className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg mt-4"
                                        >
                                            Concluir
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

export default TripSuggestions;
