import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Toast, { ToastType } from '../components/Toast';
import { storageService } from '../services/storageService';
import { Trip } from '../types';
import ConfirmModal from '../components/ConfirmModal';
import Loading from '../components/Loading';

const EditTrip: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        imageUrl: '',
        status: 'draft' as any,
        tripType: 'group' as any,
        financeMode: 'split' as any
    });

    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    useEffect(() => {
        const loadTrip = async () => {
            if (id) {
                const foundTrip = await storageService.getTripById(id);
                if (foundTrip) {
                    setTrip(foundTrip);
                    setFormData({
                        title: foundTrip.title,
                        destination: foundTrip.destination,
                        startDate: foundTrip.startDate || '',
                        endDate: foundTrip.endDate || '',
                        budget: foundTrip.budget?.toString() || '',
                        imageUrl: foundTrip.imageUrl || '',
                        status: foundTrip.status,
                        tripType: foundTrip.tripType || 'group',
                        financeMode: foundTrip.financeMode || 'split'
                    });
                } else {
                    navigate('/dashboard');
                }
            }
        };
        loadTrip();
    }, [id, navigate]);

    const formatDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    const handleSubmit = async (e: React.FormEvent, newStatus: 'draft' | 'confirmed') => {
        if (e) e.preventDefault();
        if (!id || !formData.title.trim() || !formData.destination.trim()) return;

        setIsSubmitting(true);

        const dateRange = formData.startDate && formData.endDate
            ? `${formatDate(formData.startDate)} - ${formatDate(formData.endDate)}`
            : 'A definir';

        const updated = await storageService.updateTrip(id, {
            ...formData,
            budget: formData.budget ? parseFloat(formData.budget) : undefined,
            status: newStatus,
            dateRange
        });

        if (updated) {
            const message = newStatus === 'confirmed'
                ? 'Viagem atualizada e confirmada! 🎉'
                : 'Viagem atualizada com sucesso ✓';
            setToast({ message, type: 'success' });

            setTimeout(() => {
                navigate(`/trip/${id}`);
            }, 1000);
        }
        setIsSubmitting(false);
    };

    const handleDeleteTrip = async () => {
        if (!id) return;
        setIsSubmitting(true);
        const success = await storageService.deleteTrip(id);
        if (success) {
            setToast({ message: 'Viagem excluída com sucesso.', type: 'info' });
            setTimeout(() => {
                navigate('/dashboard');
            }, 1000);
        } else {
            setToast({ message: 'Erro ao excluir viagem.', type: 'error' });
            setIsSubmitting(false);
        }
    };

    const isFormValid = formData.title && formData.destination;

    if (!trip) {
        return <Loading />;
    }

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <ConfirmModal
                isOpen={showDeleteModal}
                title="Excluir Viagem?"
                message="Tem certeza que deseja apagar esta viagem? Todas as despesas e participantes serão removidos. Esta ação não pode ser desfeita."
                confirmText="Sim, Excluir"
                cancelText="Cancelar"
                onConfirm={handleDeleteTrip}
                onCancel={() => setShowDeleteModal(false)}
                type="danger"
            />

            <header className="sticky top-0 z-30 bg-warm-cream/90 backdrop-blur-xl px-6 pt-14 pb-6 border-b border-terracotta-100/50">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-sunset-dark">Editar Viagem</h1>
                </div>
                <p className="text-sunset-muted text-sm">Atualize os detalhes da sua viagem</p>
            </header>

            <main className="flex-1 px-6 py-6">
                <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
                    {formData.status === 'draft' && (
                        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl p-5 border border-amber-200/50">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-amber-600 mt-0.5">info</span>
                                <div>
                                    <h3 className="font-bold text-sm text-sunset-dark mb-1">Viagem em Rascunho</h3>
                                    <p className="text-xs text-sunset-muted">As mudanças podem ser salvas como rascunho ou confirmadas.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-2xl p-6 border border-terracotta-100 shadow-sm space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Nome da Viagem</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark transition-all focus:ring-2 focus:ring-terracotta-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Destino</label>
                            <input
                                type="text"
                                value={formData.destination}
                                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark transition-all focus:ring-2 focus:ring-terracotta-400"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-sunset-dark mb-2">Data Início</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark transition-all focus:ring-2 focus:ring-terracotta-400"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-sunset-dark mb-2">Data Fim</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark transition-all focus:ring-2 focus:ring-terracotta-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Orçamento Estimado</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted">R$</span>
                                <input
                                    type="number"
                                    value={formData.budget}
                                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                                    className="w-full h-12 pl-12 pr-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sunset-dark transition-all focus:ring-2 focus:ring-terracotta-400"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Foto da Capa (URL)</label>
                            <div className="space-y-3">
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted">
                                        <span className="material-symbols-outlined text-base">image</span>
                                    </span>
                                    <input
                                        type="text"
                                        value={formData.imageUrl}
                                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                        placeholder="Cole o link de uma imagem"
                                        className="w-full h-12 pl-12 pr-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none text-sm text-sunset-dark transition-all focus:ring-2 focus:ring-terracotta-400"
                                    />
                                </div>
                                {formData.imageUrl && (
                                    <div className="w-full h-32 rounded-xl overflow-hidden border border-terracotta-100 group relative bg-terracotta-50/50">
                                        <img
                                            src={formData.imageUrl}
                                            alt="Preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-white text-[10px] font-bold uppercase">Preview da Foto</span>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] text-sunset-muted px-1 italic">Dica: Use links do Unsplash para melhores resultados.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {formData.status === 'draft' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e as any, 'confirmed')}
                                    disabled={!isFormValid || isSubmitting}
                                    className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined">check_circle</span>
                                    Salvar e Confirmar
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => handleSubmit(e as any, 'draft')}
                                    disabled={!isFormValid || isSubmitting}
                                    className="w-full h-14 bg-white border-2 border-terracotta-200 text-terracotta-600 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined">save</span>
                                    Salvar como Rascunho
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={(e) => handleSubmit(e as any, 'confirmed')}
                                disabled={!isFormValid || isSubmitting}
                                className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                            >
                                <span className="material-symbols-outlined">save</span>
                                Salvar Alterações
                            </button>
                        )}
                    </div>

                    {/* Danger Zone */}
                    <div className="mt-8 pt-6 border-t border-terracotta-100">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(true)}
                            className="w-full h-12 bg-red-50 text-red-600 font-bold rounded-xl border border-red-100 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-red-100"
                        >
                            <span className="material-symbols-outlined">delete</span>
                            Excluir Viagem
                        </button>
                    </div>
                </form>
            </main>

            <BottomNav />
        </div>
    );
};

export default EditTrip;
