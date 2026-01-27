import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Suggestion, SuggestionComment } from '../types';
import BottomNav from '../components/BottomNav';
import Toast, { ToastType } from '../components/Toast';
import Loading from '../components/Loading';
import ImageUpload from '../components/ImageUpload';
import { DEFAULT_TRIP_IMAGE } from '../constants';

const CATEGORIES = [
    { id: 'Hospedagem', icon: 'bed', label: 'Hospedagem' },
    { id: 'Transporte', icon: 'flight', label: 'Transporte' },
    { id: 'Passeios', icon: 'confirmation_number', label: 'Passeios' },
    { id: 'Restaurantes', icon: 'restaurant', label: 'Restaurantes' },
    { id: 'Outros', icon: 'shopping_bag', label: 'Outros' },
];

const SuggestionDetail: React.FC = () => {
    const { id, suggestionId } = useParams();
    const navigate = useNavigate();
    const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
    const [newComment, setNewComment] = useState('');
    const [comments, setComments] = useState<SuggestionComment[]>([]);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [showPriceSyncConfirm, setShowPriceSyncConfirm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDeleteSyncConfirm, setShowDeleteSyncConfirm] = useState(false);
    const [editFormData, setEditFormData] = useState({
        title: '',
        price: '',
        category: '',
        location: '',
        description: '',
        imageUrl: '',
        status: 'idea' as 'idea' | 'confirmed',
        externalUrl: ''
    });

    useEffect(() => {
        const loadData = async () => {
            if (suggestionId) {
                setIsLoading(true);
                // Need a getSuggestionById in storageService or fetch all suggestions and find
                const allSuggestions = await storageService.getSuggestionsByTrip(id!);
                const found = allSuggestions.find(s => s.id === suggestionId);
                setSuggestion(found || null);

                if (found) {
                    const storedComments = await storageService.getCommentsBySuggestion(suggestionId);
                    setComments(storedComments);
                    setEditFormData({
                        title: found.title,
                        price: found.price.replace('R$ ', ''),
                        category: found.category,
                        location: found.location,
                        description: found.description || '',
                        imageUrl: found.imageUrl,
                        status: found.status,
                        externalUrl: found.externalUrl || ''
                    });
                }
                setIsLoading(false);
            }
        };
        loadData();
    }, [id, suggestionId]);

    const handleShareWhatsApp = () => {
        const suggestionUrl = `${window.location.origin}/#/trip/${id}/suggestion/${suggestionId}`;
        const message = `Confira essa sugestão: ${suggestion?.title}!\n${suggestionUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopyLink = () => {
        const suggestionUrl = `${window.location.origin}/#/trip/${id}/suggestion/${suggestionId}`;
        navigator.clipboard.writeText(suggestionUrl);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleConfirm = async () => {
        if (!suggestionId || !id) return;
        const updated = await storageService.updateSuggestion(suggestionId, { status: 'confirmed' });
        if (updated) {
            setSuggestion(updated);
            setToast({ message: 'Sugestão confirmada! ✨', type: 'success' });
        }
    };

    const handleDelete = async (syncFinance: boolean = false) => {
        if (!suggestionId || !id) return;

        // If it's confirmed, check if we need to sync delete but haven't asked yet
        if (suggestion?.status === 'confirmed' && !syncFinance && !showDeleteSyncConfirm) {
            const expenses = await storageService.getExpensesByTrip(id);
            const matchingExpense = expenses.find(e =>
                e.description?.includes(suggestion?.title || '')
            );

            if (matchingExpense) {
                setShowDeleteSyncConfirm(true);
                setShowDeleteConfirm(false);
                return;
            }
        }

        const success = await storageService.deleteSuggestion(suggestionId);
        if (success) {
            if (syncFinance) {
                const expenses = await storageService.getExpensesByTrip(id);
                const matchingExpense = expenses.find(e =>
                    e.description?.includes(suggestion?.title || '')
                );
                if (matchingExpense) {
                    await storageService.deleteExpense(matchingExpense.id);
                }
            }

            setToast({ message: syncFinance ? 'Item e lançamento removidos!' : 'Item removido com sucesso!', type: 'success' });
            setTimeout(() => navigate(`/trip/${id}`), 1000);
        }
    };

    const handleUpdate = async (syncFinance: boolean = false) => {
        if (!suggestionId || !id) return;

        const priceChanged = editFormData.price !== suggestion?.price.replace('R$ ', '');

        // If price changed and it's confirmed, ask for sync if not already decided
        if (priceChanged && suggestion?.status === 'confirmed' && !syncFinance && !showPriceSyncConfirm) {
            setShowPriceSyncConfirm(true);
            return;
        }

        const updated = await storageService.updateSuggestion(suggestionId, {
            ...editFormData,
            price: editFormData.price ? `R$ ${editFormData.price}` : 'A consultar'
        });

        if (updated) {
            if (syncFinance) {
                // Try to find and update matching expense
                const expenses = await storageService.getExpensesByTrip(id);
                const matchingExpense = expenses.find(e =>
                    e.description?.includes(suggestion?.title || '') ||
                    e.description?.includes(editFormData.title)
                );

                if (matchingExpense) {
                    await storageService.updateExpense(matchingExpense.id, {
                        amount: parseFloat(editFormData.price.replace(',', '.'))
                    });
                }
            }

            setSuggestion(updated);
            setShowEditModal(false);
            setShowPriceSyncConfirm(false);
            setToast({
                message: syncFinance ? 'Item e finanças atualizados! 💰' : 'Item atualizado! ✨',
                type: 'success'
            });
        }
    };

    const handleSendComment = async () => {
        if (newComment.trim() && suggestionId) {
            const comment = await storageService.createComment({
                suggestionId,
                userId: 'current-user',
                userName: 'Você',
                userAvatar: 'https://picsum.photos/id/64/100/100',
                text: newComment.trim(),
            });
            if (comment) {
                setComments(prev => [...prev, comment]);
                setNewComment('');
                setToast({ message: 'Comentário adicionado! 💬', type: 'success' });
            }
        }
    };

    if (isLoading) return <Loading />;
    if (!suggestion) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-sunset-muted">Sugestão não encontrada</p>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-48">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="relative h-[400px] w-full">
                <img
                    src={suggestion.imageUrl || DEFAULT_TRIP_IMAGE}
                    alt={suggestion.title}
                    className="w-full h-full object-cover"
                    onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>

                <div className="absolute top-12 left-6 right-6 flex justify-between items-center">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white"
                    >
                        <span className="material-symbols-outlined">chevron_left</span>
                    </button>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowActionsModal(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white"
                        >
                            <span className="material-symbols-outlined font-bold">more_vert</span>
                        </button>
                        <button
                            onClick={() => setShowShareModal(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white"
                        >
                            <span className="material-symbols-outlined">share</span>
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-8 left-6 right-6 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-terracotta-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                            {suggestion.category}
                        </span>
                        {suggestion.status === 'confirmed' && (
                            <span className="bg-green-500 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs fill">check_circle</span>
                                Confirmado
                            </span>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold">{suggestion.title}</h1>
                    <p className="text-white/80 text-sm mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">location_on</span>
                        {suggestion.location}
                    </p>
                </div>
            </div>

            <main className="flex-1 px-6 -mt-4 relative z-10 space-y-6">
                <section className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold flex items-center gap-2 text-lg">
                            <span className="material-symbols-outlined text-terracotta-500">payments</span>
                            Informações
                        </h3>
                        <span className="text-2xl font-bold text-terracotta-600">{suggestion.price}</span>
                    </div>

                    {suggestion.description && (
                        <p className="text-sm text-sunset-muted leading-relaxed">
                            {suggestion.description}
                        </p>
                    )}

                    {suggestion.confirmedBy && (
                        <div className="mt-4 pt-4 border-t border-terracotta-50">
                            <p className="text-xs text-sunset-muted">
                                Confirmado por <span className="font-bold text-terracotta-600">{suggestion.confirmedBy}</span>
                            </p>
                        </div>
                    )}
                </section>

                <section className="space-y-4">
                    <h3 className="font-bold text-lg px-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-terracotta-500">forum</span>
                        Comentários
                    </h3>

                    {comments.length > 0 ? (
                        <div className="space-y-4">
                            {comments.map(comment => (
                                <div key={comment.id} className="flex items-start gap-3">
                                    <img
                                        src={comment.userAvatar}
                                        alt={comment.userName}
                                        className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                                    />
                                    <div className="flex-1 bg-white border border-terracotta-50 rounded-2xl rounded-tl-none p-3 shadow-sm">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-xs font-bold text-terracotta-500">{comment.userName}</p>
                                            <p className="text-[10px] text-sunset-muted">
                                                {new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </p>
                                        </div>
                                        <p className="text-sm text-sunset-dark">{comment.text}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center text-sunset-muted py-8 text-sm">Nenhum comentário ainda.</p>
                    )}

                    <div className="flex items-center gap-3 bg-white p-3 px-4 rounded-2xl border border-terracotta-100 shadow-sm">
                        <input
                            className="flex-1 bg-transparent border-none text-sm focus:ring-0 outline-none"
                            placeholder="Adicionar comentário..."
                            type="text"
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendComment()}
                        />
                        <button onClick={handleSendComment} className="text-terracotta-500">
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </section>
            </main>

            <div className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto z-50">
                <div className="bg-white/90 backdrop-blur-xl border-t border-terracotta-100 px-6 py-4 flex items-center gap-4">
                    <button onClick={() => setShowDeleteConfirm(true)} className="w-12 h-12 border border-red-200 text-red-500 rounded-2xl active:scale-95 transition-transform">
                        <span className="material-symbols-outlined">delete_outline</span>
                    </button>
                    {suggestion.status === 'idea' ? (
                        <button onClick={handleConfirm} className="flex-1 h-12 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg">
                            Confirmar Escolha
                        </button>
                    ) : (
                        <div className="flex-1 h-12 bg-green-500/10 text-green-600 font-bold rounded-2xl flex items-center justify-center gap-2">
                            <span className="material-symbols-outlined">check_circle</span>
                            Confirmado
                        </div>
                    )}
                </div>
                <BottomNav />
            </div>
            {/* Actions Menu Modal */}
            {showActionsModal && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center max-w-[480px] mx-auto animate-fade-in">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowActionsModal(false)}></div>
                    <div className="relative w-full bg-white rounded-t-[32px] p-6 animate-slide-up">
                        <div className="w-12 h-1.5 bg-terracotta-100 rounded-full mx-auto mb-6"></div>
                        <div className="space-y-3">
                            <button
                                onClick={() => { setShowActionsModal(false); setShowEditModal(true); }}
                                className="w-full flex items-center gap-4 p-4 bg-warm-cream rounded-2xl active:scale-95 transition-all"
                            >
                                <div className="w-10 h-10 bg-terracotta-100 rounded-full flex items-center justify-center text-terracotta-600">
                                    <span className="material-symbols-outlined">edit</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sunset-dark">Editar Informações</p>
                                    <p className="text-xs text-sunset-muted">Alterar nome, preço ou detalhes</p>
                                </div>
                            </button>
                            <button
                                onClick={() => { setShowActionsModal(false); setShowDeleteConfirm(true); }}
                                className="w-full flex items-center gap-4 p-4 bg-red-50 rounded-2xl active:scale-95 transition-all"
                            >
                                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                                    <span className="material-symbols-outlined">delete</span>
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-red-600">Remover Item</p>
                                    <p className="text-xs text-red-400">Excluir permanentemente do roteiro</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setShowActionsModal(false)}
                                className="w-full py-4 text-sm font-bold text-sunset-muted"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal (Bottom Sheet) */}
            {showEditModal && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center max-w-[480px] mx-auto animate-fade-in shadow-2xl">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
                    <div className="relative w-full bg-white rounded-t-[32px] overflow-hidden animate-slide-up no-scrollbar" style={{ maxHeight: '90vh' }}>
                        <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4 flex items-center justify-between z-10">
                            <h2 className="text-xl font-bold">Editar Item</h2>
                            <button onClick={() => setShowEditModal(false)} className="w-8 h-8 rounded-full bg-terracotta-50 flex items-center justify-center text-terracotta-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-80px)] pb-12">
                            {/* Status Toggle */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-3 block">Tipo do Item</label>
                                <div className="flex p-1 bg-terracotta-100/40 rounded-2xl">
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData({ ...editFormData, status: 'confirmed' })}
                                        className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${editFormData.status === 'confirmed' ? 'bg-emerald-500 text-white shadow-sm' : 'text-sunset-muted'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">check_circle</span>
                                        Confirmado
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setEditFormData({ ...editFormData, status: 'idea' })}
                                        className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${editFormData.status === 'idea' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">lightbulb</span>
                                        Ideia
                                    </button>
                                </div>
                            </div>

                            {/* Category Selector */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-3 block">Categoria</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setEditFormData({ ...editFormData, category: cat.id })}
                                            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${editFormData.category === cat.id
                                                ? 'text-terracotta-600'
                                                : 'text-sunset-muted'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined text-xl mb-0.5 ${editFormData.category === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                                }`}>
                                                {cat.icon}
                                            </span>
                                            <span className={`text-[9px] font-bold ${editFormData.category === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                                }`}>
                                                {cat.label}
                                            </span>
                                            {editFormData.category === cat.id && (
                                                <div className="w-1 h-1 bg-terracotta-500 rounded-full mt-0.5"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title Input */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Nome do lugar
                                </label>
                                <input
                                    type="text"
                                    value={editFormData.title}
                                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                                    placeholder="Ex: Airbnb com vista para o mar"
                                    className="w-full h-14 bg-warm-cream border border-terracotta-100 rounded-2xl px-4 font-bold text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200"
                                    required
                                />
                            </div>

                            {/* Image Upload */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">image</span>
                                    Foto do item
                                </label>
                                <ImageUpload
                                    currentImage={editFormData.imageUrl || DEFAULT_TRIP_IMAGE}
                                    onImageChange={(url) => setEditFormData({ ...editFormData, imageUrl: url })}
                                    folder="items"
                                    aspectRatio={16 / 9}
                                    placeholder="Adicionar foto"
                                    className="h-40"
                                />
                            </div>

                            {/* Location + Price Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">location_on</span>
                                        Localização
                                    </label>
                                    <input
                                        type="text"
                                        value={editFormData.location}
                                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                        placeholder="Ex: Centro"
                                        className="w-full h-14 bg-warm-cream border border-terracotta-100 rounded-2xl px-4 font-medium text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">payments</span>
                                        Valor (R$)
                                    </label>
                                    <input
                                        type="number"
                                        value={editFormData.price}
                                        onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                                        placeholder="0,00"
                                        className="w-full h-14 bg-warm-cream border border-terracotta-100 rounded-2xl px-4 font-bold text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200"
                                    />
                                </div>
                            </div>

                            {/* Link Input */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">link</span>
                                    Link (opcional)
                                </label>
                                <input
                                    type="url"
                                    value={editFormData.externalUrl}
                                    onChange={(e) => setEditFormData({ ...editFormData, externalUrl: e.target.value })}
                                    placeholder="https://airbnb.com/..."
                                    className="w-full h-14 bg-warm-cream border border-terracotta-100 rounded-2xl px-4 font-medium text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Notas Adicionais
                                </label>
                                <textarea
                                    value={editFormData.description}
                                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                                    placeholder="Ex: Reserva confirmada no nome de Carol..."
                                    rows={3}
                                    className="w-full bg-warm-cream border border-terracotta-100 rounded-2xl p-4 font-medium text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200 resize-none"
                                />
                            </div>

                            <button onClick={() => handleUpdate(false)} className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/20 active:scale-95 transition-transform mt-4 mb-8">
                                Salvar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Price Sync Confirmation Modal */}
            {showPriceSyncConfirm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPriceSyncConfirm(false)}></div>
                    <div className="relative bg-white rounded-[32px] p-8 w-full max-w-[340px] text-center shadow-2xl animate-fade-in">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl">sync_alt</span>
                        </div>
                        <h3 className="text-xl font-bold text-sunset-dark mb-2">Atualizar Finanças?</h3>
                        <p className="text-sm text-sunset-muted mb-6">Detectamos uma mudança no preço. Deseja atualizar o valor nas finanças também?</p>
                        <div className="space-y-3">
                            <button onClick={() => handleUpdate(true)} className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95">
                                Sim, atualizar ambos
                            </button>
                            <button onClick={() => handleUpdate(false)} className="w-full py-4 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg active:scale-95">
                                Não, apenas o roteiro
                            </button>
                            <button onClick={() => setShowPriceSyncConfirm(false)} className="w-full py-4 bg-terracotta-50 text-sunset-dark font-bold rounded-2xl active:scale-95">
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Sync Confirmation Modal */}
            {showDeleteSyncConfirm && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteSyncConfirm(false)}></div>
                    <div className="relative bg-white rounded-[32px] p-8 w-full max-w-[340px] text-center shadow-2xl animate-fade-in">
                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl">delete_sweep</span>
                        </div>
                        <h3 className="text-xl font-bold text-sunset-dark mb-2">Excluir Lançamento?</h3>
                        <p className="text-sm text-sunset-muted mb-6">Este item possui uma despesa associada nas finanças. Deseja excluir o lançamento financeiro também?</p>
                        <div className="space-y-3">
                            <button onClick={() => handleDelete(true)} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 active:scale-95">
                                Sim, excluir item e despesa
                            </button>
                            <button onClick={() => handleDelete(false)} className="w-full py-4 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg active:scale-95">
                                Não, apenas o item
                            </button>
                            <button onClick={() => setShowDeleteSyncConfirm(false)} className="w-full py-4 bg-terracotta-50 text-sunset-dark font-bold rounded-2xl active:scale-95">
                                Voltar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center px-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}></div>
                    <div className="relative bg-white rounded-[32px] p-8 w-full max-w-[340px] text-center shadow-2xl animate-fade-in">
                        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-outlined text-3xl">delete_forever</span>
                        </div>
                        <h3 className="text-xl font-bold text-sunset-dark mb-2">Excluir Item?</h3>
                        <p className="text-sm text-sunset-muted mb-6">Esta ação não pode ser desfeita. Deseja continuar?</p>
                        <div className="space-y-3">
                            <button onClick={() => handleDelete(false)} className="w-full py-4 bg-red-500 text-white font-bold rounded-2xl shadow-lg shadow-red-500/30 active:scale-95">
                                Sim, Excluir
                            </button>
                            <button onClick={() => setShowDeleteConfirm(false)} className="w-full py-4 bg-terracotta-50 text-sunset-dark font-bold rounded-2xl active:scale-95">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuggestionDetail;
