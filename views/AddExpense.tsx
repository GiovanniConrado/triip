import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { storageService } from '../services/storageService';
import { ExpenseCategory, Trip } from '../types';
import Loading from '../components/Loading';

const AddExpense: React.FC = () => {
    const navigate = useNavigate();
    const { tripId } = useParams<{ tripId?: string }>();
    const [trips, setTrips] = useState<Trip[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [formData, setFormData] = useState({
        tripId: tripId || '',
        category: 'Alimentação' as ExpenseCategory,
        amount: '',
        paidBy: '',
        description: '',
        participants: [] as string[],
    });

    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            const allTrips = await storageService.getTrips();
            setTrips(allTrips);

            if (tripId) {
                const trip = await storageService.getTripById(tripId);
                if (trip) {
                    setFormData(prev => ({
                        ...prev,
                        tripId,
                        paidBy: trip.participants[0]?.id || '',
                        participants: trip.participants.map(p => p.id),
                    }));
                }
            }
            setIsLoading(false);
        };
        loadInitialData();
    }, [tripId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.tripId || !formData.amount || !formData.paidBy) {
            return;
        }

        const created = await storageService.createExpense({
            tripId: formData.tripId,
            category: formData.category,
            amount: parseFloat(formData.amount),
            paidBy: formData.paidBy,
            participants: formData.participants,
            status: 'pending',
            date: new Date().toISOString(),
            description: formData.description,
        });

        if (created) {
            navigate(`/trip/${formData.tripId}`);
        }
    };

    const selectedTrip = trips.find(t => t.id === formData.tripId);

    const toggleParticipant = (participantId: string) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.includes(participantId)
                ? prev.participants.filter(id => id !== participantId)
                : [...prev.participants, participantId],
        }));
    };

    if (isLoading) return <Loading />;

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <header className="sticky top-0 z-30 bg-warm-cream/90 backdrop-blur-xl px-6 pt-14 pb-6 border-b border-terracotta-100/50">
                <div className="flex items-center gap-4 mb-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <h1 className="text-2xl font-bold tracking-tight text-sunset-dark">Nova Despesa</h1>
                </div>
            </header>

            <main className="flex-1 px-6 py-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="bg-white rounded-2xl p-6 border border-terracotta-100 shadow-sm space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Viagem</label>
                            <select
                                value={formData.tripId}
                                onChange={(e) => setFormData({ ...formData, tripId: e.target.value })}
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none"
                                required
                            >
                                <option value="">Selecione uma viagem</option>
                                {trips.map(trip => (
                                    <option key={trip.id} value={trip.id}>{trip.title}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Categoria</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none"
                                required
                            >
                                <option value="Hospedagem">Hospedagem</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Alimentação">Alimentação</option>
                                <option value="Passeios">Passeios</option>
                                <option value="Outros">Outros</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Valor</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full h-12 pl-12 pr-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-sunset-dark mb-2">Quem Pagou</label>
                            <select
                                value={formData.paidBy}
                                onChange={(e) => setFormData({ ...formData, paidBy: e.target.value })}
                                className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-xl outline-none"
                                required
                            >
                                <option value="">Selecione quem pagou</option>
                                {selectedTrip?.participants.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedTrip && (
                            <div>
                                <label className="block text-sm font-semibold text-sunset-dark mb-3">Participantes</label>
                                <div className="space-y-2">
                                    {selectedTrip.participants.map(p => (
                                        <label key={p.id} className="flex items-center gap-3 p-3 bg-warm-cream rounded-xl cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={formData.participants.includes(p.id)}
                                                onChange={() => toggleParticipant(p.id)}
                                                className="w-5 h-5 rounded border-terracotta-200"
                                            />
                                            <span className="font-medium text-sunset-dark">{p.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                    >
                        Registrar Gasto
                    </button>
                </form>
            </main>
            <BottomNav />
        </div>
    );
};

export default AddExpense;
