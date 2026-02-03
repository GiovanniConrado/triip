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
    const [expandedSettlement, setExpandedSettlement] = React.useState<string | null>(null);

    // Filtra despesas com parcelas pendentes
    const pendingInstallmentExpenses = expenses.filter(e =>
        e.paymentMethod === 'installment' &&
        e.installment &&
        e.installment.paid < e.installment.total
    );

    const getBreakdown = (fromId: string, toId: string) => {
        const sharedExpenses = expenses.filter(e =>
            e.paidBy === toId && e.participants.includes(fromId)
        );

        let cashTotal = 0;
        let installmentTotal = 0;
        const installmentDetails: { description: string; total: number; paid: number; amount: number; perPerson: number }[] = [];

        sharedExpenses.forEach(e => {
            const share = e.amount / (e.participants.length || 1);
            if (e.paymentMethod === 'installment' && e.installment) {
                installmentTotal += share;
                installmentDetails.push({
                    description: e.description || 'Sem descrição',
                    total: e.installment.total,
                    paid: e.installment.paid,
                    amount: e.installment.amount,
                    perPerson: e.installment.amount / (e.participants.length || 1)
                });
            } else {
                cashTotal += share;
            }
        });

        return { cashTotal, installmentTotal, installmentDetails };
    };

    const handleShareWhatsApp = () => {
        if (settlements.length === 0) return;

        const activeSettlements = settlements.filter(s => !settledPayments.includes(s.id));
        if (activeSettlements.length === 0) return;

        let message = `*TRIIP : RESUMO DE ACERTOS* ✈️💸\n\n`;

        activeSettlements.forEach((s, idx) => {
            const fromName = s.from?.name?.split(' ')[0] || 'Alguém';
            const toName = s.to?.name?.split(' ')[0] || 'alguém';
            const { cashTotal, installmentTotal, installmentDetails } = getBreakdown(s.from.id, s.to.id);

            message += `*DE:* ${fromName}\n`;
            message += `*PARA:* ${toName}\n`;
            message += `*TOTAL:* R$ ${s.amount.toFixed(2)}\n`;

            if (cashTotal > 0) {
                message += `💰 *À VISTA:* R$ ${cashTotal.toFixed(2)}\n`;
            }

            if (installmentTotal > 0) {
                message += `💳 *PARCELADOS:* R$ ${installmentTotal.toFixed(2)}\n`;
                installmentDetails.forEach(det => {
                    const remainingValue = (det.total - det.paid) * det.perPerson;
                    message += `   └ ${det.description}: ${det.total}x de R$ ${det.perPerson.toFixed(2)} `;
                    message += `(Faltam ${det.total - det.paid} parc. • R$ ${remainingValue.toFixed(2)})\n`;
                });
            }

            if (idx < activeSettlements.length - 1) message += `\n-------------------\n\n`;
        });

        message += `\n_Gerado automaticamente pelo Triip_`;

        const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    return (
        <div className="space-y-6">
            {/* Optimization badge & Share button */}
            <div className="flex flex-col gap-3">
                <div className={`rounded-2xl p-3 flex items-center gap-3 ${optimizeTransfers ? 'bg-emerald-50 border border-emerald-200' : 'bg-white border border-terracotta-100'}`}>
                    <span className="material-symbols-outlined text-xl text-emerald-600">
                        {optimizeTransfers ? 'check_circle' : 'info'}
                    </span>
                    <div className="flex-1">
                        <p className="text-xs font-bold text-sunset-dark">
                            {optimizeTransfers ? 'Transferências otimizadas' : 'Modo simples'}
                        </p>
                        <p className="text-[10px] text-sunset-muted">
                            {optimizeTransfers ? 'Otimização ativada para minimizar PIX' : 'Ative nas configurações para simplificar'}
                        </p>
                    </div>
                </div>

                {settlements.length > 0 && settlements.some(s => !settledPayments.includes(s.id)) && (
                    <button
                        onClick={handleShareWhatsApp}
                        className="w-full h-12 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <span className="material-symbols-outlined text-xl">share</span>
                        Compartilhar Detalhes no WhatsApp
                    </button>
                )}
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

                            // Encontrar quem pagou a despesa
                            const payer = expenses.find(e => e.id === exp.id)?.paidBy;
                            // Simplificação: o componente recebe Participants[], mas aqui só temos o ID do payer no Expense.
                            // Mas `expenses` no props deve ter o que precisamos se passarmos corretamente.
                            // Em Finance.tsx, currentTrip.participants tem os nomes.

                            return (
                                <div key={exp.id} className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm space-y-3 animate-fade-in">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 mr-2">
                                            <p className="font-bold text-sunset-dark text-sm truncate">{exp.description}</p>
                                            <p className="text-[10px] text-sunset-muted font-bold">
                                                PARCELA {nextInstallment}/{total} • {exp.participants?.length || 1} pessoas
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
                                        Confirmar Pagamento da Parcela {nextInstallment}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <h3 className="text-xs font-bold uppercase tracking-widest text-sunset-muted flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">sync_alt</span>
                Para acertar o Saldo Atual
            </h3>

            {settlements.filter(s => !settledPayments.includes(s.id)).length === 0 ? (
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-3xl p-8 text-center border border-emerald-200">
                    <span className="material-symbols-outlined text-5xl text-emerald-400">celebration</span>
                    <p className="font-bold text-emerald-700 mt-3">Tudo em dia por enquanto! 🎉</p>
                    <p className="text-xs text-emerald-600 mt-1">Acertos pendentes aparecerão aqui</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {settlements.filter(s => !settledPayments.includes(s.id)).map(s => {
                        const { cashTotal, installmentTotal, installmentDetails } = getBreakdown(s.from.id, s.to.id);
                        const isExpanded = expandedSettlement === s.id;

                        return (
                            <div key={s.id} className="bg-white rounded-3xl overflow-hidden border border-terracotta-100 shadow-sm transition-all duration-300">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className="relative">
                                                <img src={s.from.avatar} alt={s.from.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-terracotta-500 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[10px] text-white">upload</span>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-black text-sunset-dark text-xs truncate">{(s.from?.name || 'Participante').split(' ')[0]}</p>
                                                <p className="text-[10px] text-sunset-muted">DEVEDOR</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-center">
                                            <span className="font-black text-terracotta-600 text-xl leading-none">R$ {s.amount.toFixed(2)}</span>
                                            <div className="flex items-center gap-0.5 mt-1">
                                                <span className="material-symbols-outlined text-terracotta-300 text-[10px]">arrow_forward</span>
                                                <span className="material-symbols-outlined text-terracotta-300 text-[10px]">arrow_forward</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="font-black text-sunset-dark text-xs truncate">{(s.to?.name || 'Participante').split(' ')[0]}</p>
                                                <p className="text-[10px] text-sunset-muted">CREDOR</p>
                                            </div>
                                            <div className="relative">
                                                <img src={s.to.avatar} alt={s.to.name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-[10px] text-white">download</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick breakdown preview */}
                                    <div className="flex gap-2 mb-4">
                                        {cashTotal > 0 && (
                                            <div className="flex-1 bg-terracotta-50/50 rounded-xl p-2 border border-terracotta-100">
                                                <p className="text-[8px] font-bold text-terracotta-600 uppercase">À Vista</p>
                                                <p className="font-bold text-sunset-dark">R$ {cashTotal.toFixed(2)}</p>
                                            </div>
                                        )}
                                        {installmentTotal > 0 && (
                                            <div className="flex-1 bg-amber-50/50 rounded-xl p-2 border border-amber-100">
                                                <p className="text-[8px] font-bold text-amber-600 uppercase">Parcelado</p>
                                                <p className="font-bold text-sunset-dark">R$ {installmentTotal.toFixed(2)}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setExpandedSettlement(isExpanded ? null : s.id)}
                                            className="flex-1 h-10 border border-terracotta-100 text-sunset-dark font-bold rounded-xl text-xs flex items-center justify-center gap-1 active:scale-95 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-base">
                                                {isExpanded ? 'expand_less' : 'expand_more'}
                                            </span>
                                            {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                                        </button>
                                        <button
                                            onClick={() => onSettlePayment(s.id)}
                                            className="px-4 h-10 bg-emerald-500 text-white font-bold rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-emerald-500/20"
                                        >
                                            Quitar Tudo
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {isExpanded && (
                                    <div className="bg-warm-cream/30 border-t border-terracotta-100 p-4 space-y-3 animate-slide-down">
                                        {installmentTotal > 0 && (
                                            <div className="space-y-2">
                                                <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Cronograma de Parcelas</h4>
                                                {installmentDetails.map((det, i) => (
                                                    <div key={i} className="flex justify-between items-center bg-white/60 p-2 rounded-lg border border-amber-100">
                                                        <div>
                                                            <p className="text-[10px] font-bold text-sunset-dark">{det.description}</p>
                                                            <p className="text-[9px] text-sunset-muted">Pago {det.paid}/{det.total} parcelas</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black text-amber-600">R$ {det.perPerson.toFixed(2)} / mês</p>
                                                            <p className="text-[8px] text-sunset-muted">Faltam R$ {((det.total - det.paid) * det.perPerson).toFixed(2)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {cashTotal > 0 && (
                                            <div className="flex justify-between items-center bg-terracotta-50/50 p-2 rounded-lg">
                                                <span className="text-[10px] font-bold text-terracotta-700">Total à vista (transferência imediata)</span>
                                                <span className="text-[10px] font-black text-terracotta-600">R$ {cashTotal.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {settledPayments.length > 0 && (
                <div className="pt-4 border-t border-terracotta-100">
                    <p className="text-xs text-sunset-muted text-center italic">
                        ✅ {settledPayments.length} pagamento(s) já resolvidos nesta sessão
                    </p>
                </div>
            )}
        </div>
    );
};

export default SettlementList;
