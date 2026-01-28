import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Trip } from '../types';
import { DEFAULT_TRIP_IMAGE } from '../constants';
import { useAuth } from '../contexts/AuthContext';

const JoinTrip: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadTripSummary = async () => {
            if (!id) return;
            try {
                const data = await storageService.getTripById(id);
                if (data) {
                    setTrip(data);

                    // AUTO-JOIN LOGIC: If user is logged in, join immediately
                    if (user) {
                        setJoining(true);
                        const success = await storageService.joinTrip(id);
                        if (success) {
                            navigate(`/trip/${id}`);
                            return; // Stop here, we are redirecting
                        } else {
                            // If joining fails but we are logged in, we stay on the page to show errors or manual button
                            console.error('Auto-join failed, allowing manual join');
                        }
                        setJoining(false);
                    }
                } else {
                    setError('Viagem não encontrada.');
                }
            } catch (err: any) {
                console.error('Invite Load Error:', err);
                setError(`Erro ao carregar convite: ${err.message || 'Falha na conexão'}`);
            } finally {
                setLoading(false);
            }
        };
        loadTripSummary();
    }, [id, user, navigate]);

    const handleJoin = async () => {
        if (!user) {
            navigate('/login', { state: { from: `/join/${id}` } });
            return;
        }

        if (!id) return;
        setJoining(true);
        try {
            const success = await storageService.joinTrip(id);
            if (success) {
                navigate(`/trip/${id}`);
            } else {
                setError('Não foi possível se juntar à viagem.');
            }
        } catch (err) {
            setError('Erro ao processar sua entrada.');
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-warm-cream flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-terracotta-200 border-t-terracotta-600 rounded-full animate-spin mb-4"></div>
                <p className="text-sunset-muted font-bold animate-pulse">
                    {joining ? 'Entrando na viagem...' : 'Carregando convite especial...'}
                </p>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="min-h-screen bg-warm-cream flex flex-col items-center justify-center p-8 text-center">
                <div className="w-20 h-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-4xl">error</span>
                </div>
                <h1 className="text-2xl font-black text-sunset-dark mb-2">Ops! Link Inválido</h1>
                <p className="text-sunset-muted mb-8">{error || 'Esta viagem não existe mais ou o link expirou.'}</p>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="h-14 px-8 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
                >
                    Voltar para o Início
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-warm-cream">
            {/* Hero Cover */}
            <div className="relative h-[40vh] w-full">
                <img
                    src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                    alt={trip.title}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-warm-cream via-transparent to-black/30"></div>

                <div className="absolute top-12 left-6">
                    <div className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30">
                        <p className="text-white text-[10px] font-black uppercase tracking-widest">Convite Especial</p>
                    </div>
                </div>
            </div>

            {/* Content Card */}
            <div className="px-6 -mt-20 relative z-10 pb-12">
                <div className="bg-white rounded-[40px] p-8 shadow-2xl shadow-terracotta-500/10 border border-terracotta-100 text-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-terracotta-500 to-amber-500 rounded-3xl flex items-center justify-center shadow-xl shadow-terracotta-500/30 mx-auto -mt-16 mb-6">
                        <span className="material-symbols-outlined text-white text-4xl">flight_takeoff</span>
                    </div>

                    <h1 className="text-3xl font-black text-sunset-dark tracking-tight mb-2">{trip.title}</h1>
                    <div className="flex items-center justify-center gap-1 text-sunset-muted font-bold text-sm mb-6">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {trip.destination}
                    </div>

                    <div className="flex items-center justify-center gap-6 py-6 border-y border-terracotta-50 mb-8">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-sunset-muted uppercase tracking-widest mb-1">Inicia em</p>
                            <p className="font-bold text-sunset-dark">{trip.startDate ? new Date(trip.startDate).toLocaleDateString('pt-BR') : 'A definir'}</p>
                        </div>
                        <div className="w-px h-8 bg-terracotta-100"></div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-sunset-muted uppercase tracking-widest mb-1">Viajantes</p>
                            <p className="font-bold text-sunset-dark">{trip.participants?.length || 0} confirmados</p>
                        </div>
                    </div>

                    <p className="text-sunset-muted text-sm leading-relaxed mb-10">
                        Você foi convidado para participar desta viagem incrível! Junte-se ao grupo para planejar roteiros, dividir gastos e compartilhar momentos.
                    </p>

                    <button
                        onClick={handleJoin}
                        disabled={joining}
                        className={`w-full h-16 rounded-2xl font-black text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${joining
                            ? 'bg-terracotta-200 text-terracotta-400 cursor-not-allowed'
                            : 'bg-terracotta-500 text-white shadow-terracotta-500/30 hover:shadow-terracotta-500/40'
                            }`}
                    >
                        {joining ? (
                            <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">group_add</span>
                                Juntar-se à Viagem
                            </>
                        )}
                    </button>

                    {!user && (
                        <p className="text-[10px] text-sunset-muted font-bold mt-4">
                            Você precisará fazer login para entrar na viagem.
                        </p>
                    )}
                </div>

                {/* Participants Preview */}
                {trip.participants && trip.participants.length > 0 && (
                    <div className="mt-8">
                        <p className="text-center text-xs font-bold text-sunset-muted uppercase tracking-widest mb-4">Galera que já confirmou</p>
                        <div className="flex flex-wrap justify-center gap-3">
                            {trip.participants.slice(0, 5).map(p => (
                                <img
                                    key={p.id}
                                    src={p.avatar}
                                    title={p.name}
                                    className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-md"
                                    alt={p.name}
                                />
                            ))}
                            {trip.participants.length > 5 && (
                                <div className="w-10 h-10 rounded-full bg-terracotta-100 border-2 border-white shadow-md flex items-center justify-center text-[10px] font-black text-terracotta-600">
                                    +{trip.participants.length - 5}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JoinTrip;
