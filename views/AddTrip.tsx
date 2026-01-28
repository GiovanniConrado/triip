import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import Toast, { ToastType } from '../components/Toast';
import ImageUpload from '../components/ImageUpload';
import LoadingButton from '../components/LoadingButton';
import { storageService } from '../services/storageService';
import { TripStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { DEFAULT_TRIP_IMAGE } from '../constants';

const AddTrip: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        budget: '',
        imageUrl: '',
    });
    const [selectedStatus, setSelectedStatus] = useState<TripStatus>('confirmed');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setToast({ message: 'Você precisa estar logado para criar uma viagem.', type: 'error' });
            return;
        }

        setIsSubmitting(true);

        // Format date range
        let dateRange = 'A definir';
        if (formData.startDate && formData.endDate) {
            const startDate = new Date(formData.startDate);
            const endDate = new Date(formData.endDate);
            dateRange = `${startDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} - ${endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`;
        }

        try {
            const tripPayload = {
                title: formData.title,
                destination: formData.destination,
                dateRange,
                startDate: formData.startDate || null,
                endDate: formData.endDate || null,
                imageUrl: formData.imageUrl || DEFAULT_TRIP_IMAGE,
                budget: formData.budget ? parseFloat(formData.budget) : null,
                status: selectedStatus,
                participants: [],
                user_id: user.id,
            };

            const newTrip = await storageService.createTrip(tripPayload as any);

            if (newTrip) {
                const message = selectedStatus === 'confirmed'
                    ? 'Viagem confirmada com sucesso! 🎉'
                    : 'Viagem salva como rascunho 📝';
                setToast({ message, type: 'success' });

                setTimeout(() => {
                    navigate('/dashboard');
                }, 1000);
            } else {
                setToast({ message: 'Erro ao criar viagem. Tente novamente.', type: 'error' });
            }
        } catch (error) {
            console.error('Error in handleSubmit:', error);
            setToast({ message: 'Ocorreu um erro inesperado.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isFormValid = formData.title && formData.destination;

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}

            <header className="sticky top-0 z-30 bg-warm-cream/90 backdrop-blur-xl px-6 pt-14 pb-6 border-b border-terracotta-100/50">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform"
                        aria-label="Voltar"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-sunset-dark">Nova Viagem</h1>
                </div>
                <p className="text-sunset-muted text-sm">Planeje sua próxima aventura em grupo</p>
            </header>

            <main className="flex-1 px-6 py-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Status Selector */}
                    <div className="bg-white rounded-2xl p-5 border border-terracotta-100 shadow-sm">
                        <label className="block text-sm font-semibold text-sunset-dark mb-3">
                            Status da Viagem
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('confirmed')}
                                disabled={isSubmitting}
                                className={`h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${selectedStatus === 'confirmed'
                                    ? 'border-terracotta-500 bg-terracotta-50 text-terracotta-700'
                                    : 'border-terracotta-100 bg-warm-cream text-sunset-muted hover:border-terracotta-300'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl ${selectedStatus === 'confirmed' ? 'fill' : ''}`}>
                                    check_circle
                                </span>
                                <span className="text-xs font-bold">Confirmada</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSelectedStatus('draft')}
                                disabled={isSubmitting}
                                className={`h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-2 ${selectedStatus === 'draft'
                                    ? 'border-amber-500 bg-amber-50 text-amber-700'
                                    : 'border-terracotta-100 bg-warm-cream text-sunset-muted hover:border-amber-300'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl ${selectedStatus === 'draft' ? 'fill' : ''}`}>
                                    draft
                                </span>
                                <span className="text-xs font-bold">Rascunho</span>
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-terracotta-100 shadow-sm space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">
                                Nome da Viagem *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Ex: Costa Amalfitana 2024"
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl focus:ring-2 focus:ring-terracotta-400 focus:border-transparent outline-none transition-all text-sunset-dark"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">
                                Destino *
                            </label>
                            <input
                                type="text"
                                value={formData.destination}
                                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                                placeholder="Ex: Itália"
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl focus:ring-2 focus:ring-terracotta-400 focus:border-transparent outline-none transition-all text-sunset-dark"
                                required
                                disabled={isSubmitting}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-sunset-dark mb-2">Data Início</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl transition-all text-sunset-dark"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-sunset-dark mb-2">Data Fim</label>
                                <input
                                    type="date"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl transition-all text-sunset-dark"
                                    disabled={isSubmitting}
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
                                    placeholder="0,00"
                                    className="w-full h-12 pl-12 pr-4 bg-warm-cream border border-terracotta-100 rounded-xl transition-all text-sunset-dark"
                                    disabled={isSubmitting}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-3">Foto da Capa</label>
                            <ImageUpload
                                currentImage={formData.imageUrl}
                                onImageChange={(url) => setFormData({ ...formData, imageUrl: url })}
                                folder="trips"
                                aspectRatio={16 / 9}
                                placeholder="Adicionar foto da viagem"
                            />
                        </div>
                    </div>

                    <LoadingButton
                        type="submit"
                        isLoading={isSubmitting}
                        loadingText="Salvando..."
                        disabled={!isFormValid}
                        className={`w-full h-14 font-bold rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${selectedStatus === 'confirmed'
                            ? 'bg-terracotta-500 text-white'
                            : 'bg-amber-500 text-white'
                            }`}
                    >
                        {selectedStatus === 'confirmed' ? 'Confirmar Viagem' : 'Salvar Rascunho'}
                    </LoadingButton>
                </form>
            </main>

            <BottomNav />
        </div>
    );
};

export default AddTrip;
