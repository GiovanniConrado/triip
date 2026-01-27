import React from 'react';
import { Participant, Expense } from '../../types';

interface Settlement {
    id: string;
    from: Participant;
    to: Participant;
    amount: number;
}

interface SettlementListProps {
    settlements: Settlement[];
    settledPayments: string[];
    optimizeTransfers: boolean;
    onSettlePayment: (settlementId: string) => void;
    expenses?: Expense[];
    onPayInstallment?: (expense: Expense) => void;
}

const SettlementList: React.FC<SettlementListProps> = ({
    settlements,
    settledPayments,
    optimizeTransfers,
    onSettlePayment,
    expenses = [],
    onPayInstallment,
}) => {
    // Filtra despesas com parcelas pendentes
    const pendingInstallmentExpenses = expenses.filter(e =>
        e.paymentMethod === 'installment' &&
        e.installment &&
        e.installment.paid < e.installment.total
    );

    return (
        <div className="space-y-6">
            {/* Optimization badge */}
            <div className={`rounded-2xl p-3 flex items-center gap-3 ${optimizeTransfers ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-terracotta-100'}`}>
                <span className="material-symbols-outlined text-xl text-emerald-600">
                    {optimizeTransfers ? 'check_circle' : 'info'}
                </span>
                <div className="flex-1">
                    <p className="text-xs font-bold text-sunset-dark">
                        {optimizeTransfers ? 'Transferências otimizadas' : 'Modo simples'}
                    </p>
                    <p className="text-[10px] text-sunset-muted">
                        {optimizeTransfers ? 'Menos transferências possíveis' : 'Ative nas configurações para otimizar'}
                    </p>
                </div>
            </div>

            {/* Pending Installments Section */}
            {pendingInstallmentExpenses.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">credit_card</span>
                        Parcelas Pendentes
                    </h3>
                    <div className="space-y-3">
                        {pendingInstallmentExpenses.map(exp => {
                            const nextInstallment = (exp.installment?.paid || 0) + 1;
                            const total = exp.installment?.total || 1;
                            const perPersonAmount = (exp.installment?.amount || 0) / (exp.participants?.length || 1);

                            return (
                                <div key={exp.id} className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm space-y-3 animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <p className="font-bold text-sunset-dark text-sm truncate">{exp.description}</p>
                                            <p className="text-[10px] text-sunset-muted font-bold">
                                                PRÓXIMA: PARCELA {nextInstallment}/{total}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-black text-amber-600 text-lg">R$ {perPersonAmount.toFixed(2)}</p>
                                            <p className="text-[8px] text-sunset-muted uppercase font-bold">por pessoa</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onPayInstallment?.(exp)}
                                        className="w-full h-10 bg-amber-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                                    >
                                        <span className="material-symbols-outlined text-lg">payments</span>
                                        Pagar Parcela {nextInstallment}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <h3 className="text-xs font-bold uppercase tracking-widest text-sunset-muted flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">sync_alt</span>
                Para acertar o Saldo Total
            </h3>

            {settlements.length === 0 ? (
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 text-center border border-emerald-200">
                    <span className="material-symbols-outlined text-5xl text-emerald-400">celebration</span>
                    <p className="font-bold text-emerald-700 mt-3">Todas as contas acertadas! 🎉</p>
                    <p className="text-xs text-emerald-600 mt-1">Ninguém deve nada</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {settlements.map(s => (
                        <div key={s.id} className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <img src={s.from.avatar} alt={s.from.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                    <div>
                                        <p className="font-bold text-sunset-dark text-sm">{s.from.name.split(' ')[0]}</p>
                                        <p className="text-[10px] text-sunset-muted">paga</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-terracotta-400">arrow_forward</span>
                                    <span className="font-black text-terracotta-600 text-lg">R$ {s.amount.toFixed(2)}</span>
                                    <span className="material-symbols-outlined text-terracotta-400">arrow_forward</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        <p className="font-bold text-sunset-dark text-sm">{s.to.name.split(' ')[0]}</p>
                                        <p className="text-[10px] text-sunset-muted">recebe</p>
                                    </div>
                                    <img src={s.to.avatar} alt={s.to.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                </div>
                            </div>
                            <button
                                onClick={() => onSettlePayment(s.id)}
                                className="w-full h-10 bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/30"
                            >
                                <span className="material-symbols-outlined text-lg">check</span>
                                Marcar como pago
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {settledPayments.length > 0 && (
                <div className="pt-4 border-t border-terracotta-100">
                    <p className="text-xs text-sunset-muted text-center">
                        ✅ {settledPayments.length} pagamento(s) já quitado(s)
                    </p>
                </div>
            )}
        </div>
    );
};

export default SettlementList;
