import React from 'react';
import { Participant, Expense } from '../../types';

interface ParticipantListProps {
    participants: Participant[];
    expenses: Expense[];
    onAddExternal: () => void;
    onRemoveParticipant: (participantId: string) => void;
    onMergeParticipant?: (participant: Participant) => void;
    isAdmin?: boolean;
}

const ParticipantList: React.FC<ParticipantListProps> = ({
    participants,
    expenses,
    onAddExternal,
    onRemoveParticipant,
    onMergeParticipant,
    isAdmin = false,
}) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-sunset-muted flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">group</span>
                    Participantes da viagem
                </h3>
                {isAdmin && (
                    <button
                        onClick={onAddExternal}
                        className="flex items-center gap-1 px-3 py-1.5 bg-terracotta-500 text-white text-xs font-bold rounded-full active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">person_add</span>
                        Adicionar
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {participants.map(p => {
                    const participantExpenses = expenses.filter(e => e.paidBy === p.id);
                    const totalPaid = participantExpenses.reduce((sum, e) => sum + e.amount, 0);

                    return (
                        <div key={p.id} className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-3">
                            <div className="relative">
                                <img src={p.avatar} alt={p.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                                {p.isExternal && (
                                    <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                                        <span className="material-symbols-outlined text-white text-xs">person_off</span>
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <p className="font-bold text-sunset-dark">{p.name}</p>
                                    {p.role === 'admin' && (
                                        <span className="bg-terracotta-100 text-terracotta-600 text-[8px] font-bold px-1.5 py-0.5 rounded-full">ADMIN</span>
                                    )}
                                    {p.isExternal && (
                                        <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full">EXTERNO</span>
                                    )}
                                </div>
                                <p className="text-[10px] text-sunset-muted">
                                    {participantExpenses.length} despesas • R$ {totalPaid.toFixed(2)} pagos
                                </p>
                            </div>
                            {isAdmin && p.isExternal && (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => onMergeParticipant?.(p)}
                                        className="flex items-center gap-1 px-2 py-1.5 bg-amber-50 text-amber-600 outline outline-1 outline-amber-200 text-[10px] font-bold rounded-lg active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">sync_alt</span>
                                        Mesclar
                                    </button>
                                    <button
                                        onClick={() => onRemoveParticipant(p.id)}
                                        className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-400 active:scale-95 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Info card */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200 mt-4">
                <p className="text-xs text-blue-800">
                    <strong>💡 Dica:</strong> Pessoas externas são úteis para incluir quem não tem o app mas participou da viagem.
                </p>
            </div>
        </div>
    );
};

export default ParticipantList;
