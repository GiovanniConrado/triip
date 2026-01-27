import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Trip, Suggestion } from '../types';
import Toast, { ToastType } from '../components/Toast';
import ImageUpload from '../components/ImageUpload';
import { DEFAULT_TRIP_IMAGE } from '../constants';

// Same icons as Finance and TripSuggestions
const CATEGORIES = [
    { id: 'Hospedagem', icon: 'bed', label: 'Hospedagem' },
    { id: 'Transporte', icon: 'flight', label: 'Transporte' },
    { id: 'Passeios', icon: 'confirmation_number', label: 'Passeios' },
    { id: 'Restaurantes', icon: 'restaurant', label: 'Restaurantes' },
    { id: 'Outros', icon: 'shopping_bag', label: 'Outros' },
];

const AddSuggestion: React.FC = () => {
    const navigate = useNavigate();
    const { id: tripId } = useParams();

    const [trip, setTrip] = useState<Trip | null>(null);
    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('');
    const [category, setCategory] = useState('Hospedagem');
    const [link, setLink] = useState('');
    const [price, setPrice] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [status, setStatus] = useState<'idea' | 'confirmed'>('confirmed');
    const [createExpense, setCreateExpense] = useState(false);
    const [paidBy, setPaidBy] = useState('');
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    useEffect(() => {
        const loadTrip = async () => {
            if (tripId) {
                const foundTrip = await storageService.getTripById(tripId);
                setTrip(foundTrip);
                if (foundTrip?.participants?.length > 0) {
                    setPaidBy(foundTrip.participants[0].id);
                }
            }
        };
        loadTrip();
    }, [tripId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !tripId) {
            setToast({ message: 'O título é obrigatório!', type: 'error' });
            return;
        }

        const newItem: any = {
            tripId,
            title,
            category,
            location: location || 'A definir',
            price: price ? `R$ ${price}` : 'A consultar',
            rating: 5,
            imageUrl: imageUrl || DEFAULT_TRIP_IMAGE,
            description: link ? `${description}\n\nLink: ${link}` : description,
            status,
            comments: []
        };

        const created = await storageService.createSuggestion(newItem);
        if (created) {
            // Case: Auto-create expense
            if (createExpense && price && status === 'confirmed') {
                await storageService.createExpense({
                    tripId,
                    amount: parseFloat(price.replace(',', '.')),
                    description: `Reserva: ${title}`,
                    category: category as any,
                    paidBy: paidBy,
                    participants: trip?.participants.map(p => p.id) || [],
                    status: 'pending',
                    date: new Date().toISOString()
                });
            }

            setToast({ message: 'Item adicionado com sucesso! ✨', type: 'success' });

            setTimeout(() => {
                navigate(`/trip/${tripId}`);
            }, 1500);
        }
    };

    if (!trip) return null;

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-8">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header - Same style as Finance modal */}
            <header className="sticky top-0 z-30 bg-warm-cream border-b border-terracotta-100 px-6 pt-14 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-terracotta-100 text-sunset-dark active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-sunset-dark">Adicionar Item</h1>
                            <p className="text-xs text-sunset-muted">{trip.title}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-6 py-6 space-y-6">
                {/* Status Toggle */}
                <div>
                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-3 block">Tipo do Item</label>
                    <div className="flex p-1 bg-terracotta-100/40 rounded-2xl">
                        <button
                            type="button"
                            onClick={() => setStatus('confirmed')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${status === 'confirmed' ? 'bg-emerald-500 text-white shadow-sm' : 'text-sunset-muted'}`}
                        >
                            <span className="material-symbols-outlined text-lg">check_circle</span>
                            Confirmado
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatus('idea')}
                            className={`flex-1 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all ${status === 'idea' ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'}`}
                        >
                            <span className="material-symbols-outlined text-lg">lightbulb</span>
                            Sugestão / Ideia
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
                                onClick={() => setCategory(cat.id)}
                                className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${category === cat.id
                                    ? 'text-terracotta-600'
                                    : 'text-sunset-muted'
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-xl mb-0.5 ${category === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                    }`}>
                                    {cat.icon}
                                </span>
                                <span className={`text-[9px] font-bold ${category === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                    }`}>
                                    {cat.label}
                                </span>
                                {category === cat.id && (
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
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Airbnb com vista para o mar"
                        className="w-full h-14 bg-white border border-terracotta-100 rounded-2xl px-4 font-bold text-sunset-dark focus:ring-2 focus:ring-terracotta-500 focus:border-transparent outline-none transition-all placeholder:text-terracotta-200 placeholder:font-normal"
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
                        currentImage={imageUrl}
                        onImageChange={setImageUrl}
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
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ex: Centro"
                            className="w-full h-14 bg-white border border-terracotta-100 rounded-2xl px-4 font-medium text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">payments</span>
                            Valor (R$)
                        </label>
                        <input
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="0,00"
                            className="w-full h-14 bg-white border border-terracotta-100 rounded-2xl px-4 font-bold text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200"
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
                        value={link}
                        onChange={(e) => setLink(e.target.value)}
                        placeholder="https://airbnb.com/..."
                        className="w-full h-14 bg-white border border-terracotta-100 rounded-2xl px-4 font-medium text-sunset-dark focus:ring-2 focus:ring-terracotta-500 focus:border-transparent outline-none transition-all placeholder:text-terracotta-200 placeholder:font-normal"
                    />
                </div>

                {/* Expense Toggle */}
                {status === 'confirmed' && price && (
                    <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <div>
                                    <p className="font-bold text-sunset-dark">Lançar em Finanças?</p>
                                    <p className="text-[10px] text-sunset-muted">Cria uma despesa automaticamente</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCreateExpense(!createExpense)}
                                className={`w-12 h-6 rounded-full transition-all ${createExpense ? 'bg-emerald-500' : 'bg-terracotta-100'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${createExpense ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                            </button>
                        </div>

                        {createExpense && (
                            <div className="pt-4 border-t border-terracotta-50 animate-slide-down">
                                <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest block mb-2">Quem pagou?</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                    {trip?.participants.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => setPaidBy(p.id)}
                                            className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${paidBy === p.id ? 'bg-emerald-500 text-white shadow-md' : 'bg-warm-cream text-sunset-dark border border-terracotta-100'}`}
                                        >
                                            <img src={p.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                            <span className="text-xs font-bold">{p.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-sunset-muted bg-warm-cream p-2 rounded-lg mt-2 italic text-center">
                                    * A despesa será dividida igualmente entre todos os participantes.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Description */}
                <div>
                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                        Notas Adicionais
                    </label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Ex: Reserva confirmada no nome de Carol, check-in 14h..."
                        rows={3}
                        className="w-full bg-white border border-terracotta-100 rounded-2xl p-4 font-medium text-sunset-dark focus:ring-2 focus:ring-terracotta-500 outline-none transition-all placeholder:text-terracotta-200 resize-none"
                    />
                </div>

                {/* Action Buttons - Same style as Finance */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="flex-1 h-14 bg-terracotta-50 text-sunset-dark font-bold rounded-2xl active:scale-95 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        className="flex-[2] h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Adicionar ao Roteiro
                    </button>
                </div>
            </main>
        </div>
    );
};

export default AddSuggestion;
