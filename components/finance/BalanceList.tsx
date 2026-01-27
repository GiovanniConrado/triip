import React from 'react';
import { Participant, Expense } from '../../types';

interface BalanceWithAmount extends Participant {
    balance: number;
}

interface BalanceListProps {
    balances: BalanceWithAmount[];
    expenses: Expense[];
}

const BalanceList: React.FC<BalanceListProps> = ({ balances, expenses }) => {
    // Filtra apenas as despesas que possuem parcelamento
    const installmentExpenses = expenses.filter(e => e.paymentMethod === 'installment' && e.installment);

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-sunset-muted flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">people</span>
                    Saldo por participante
                </h3>

                {balances.map(p => (
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
                                {p.isExternal && (
                                    <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full">EXTERNO</span>
                                )}
                            </div>
                            <p className="text-[10px] text-sunset-muted">
                                {p.balance === 0 ? 'Tudo certo 👍' : p.balance > 0 ? 'Deve receber' : 'Deve pagar'}
                            </p>
                        </div>
                        <p className={`text-lg font-black ${p.balance === 0 ? 'text-sunset-muted' : p.balance > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            {p.balance > 0 ? '+' : ''}R$ {Math.abs(p.balance).toFixed(2)}
                        </p>
                    </div>
                ))}
            </div>

            {installmentExpenses.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">credit_card</span>
                        Detalhamento de Parcelas
                    </h3>

                    {installmentExpenses.map(exp => {
                        const paid = exp.installment?.paid || 0;
                        const total = exp.installment?.total || 1;
                        const progress = (paid / total) * 100;
                        const amountPerInstallment = exp.installment?.amount || (exp.amount / total);

                        return (
                            <div key={exp.id} className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-sunset-dark text-sm">{exp.description}</p>
                                        <p className="text-[10px] text-sunset-muted font-medium uppercase tracking-tighter">
                                            {total}x de R$ {(amountPerInstallment / (exp.participants?.length || 1)).toFixed(2)}{exp.participants?.length > 1 ? ' por pessoa' : ''}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${paid === total ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                            {paid}/{total} PAGAS
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex justify-between text-[9px] font-bold text-sunset-muted">
                                        <span>Progresso</span>
                                        <span>{progress.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-amber-50 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${paid === total ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1">
                                        <span className="material-symbols-outlined text-xs text-sunset-muted">calendar_month</span>
                                        <span className="text-[10px] text-sunset-muted">
                                            {paid === total ? 'Concluído' : `Próxima: ${exp.installment?.firstDueDate}`}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-sunset-dark">
                                        Total: R$ {exp.amount.toFixed(2)}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BalanceList;
