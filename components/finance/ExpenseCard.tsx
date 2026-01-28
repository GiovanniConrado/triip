import React from 'react';
import { Expense, Participant } from '../../types';

interface CategoryInfo {
    id: string;
    icon: string;
    label: string;
    color?: string;
}

interface ExpenseCardProps {
    expense: Expense;
    payer?: Participant;
    categoryInfo?: CategoryInfo;
    isTrackMode: boolean;
    onEdit: (expense: Expense) => void;
    onDelete: (expenseId: string) => void;
}

const ExpenseCard: React.FC<ExpenseCardProps> = ({
    expense,
    payer,
    categoryInfo,
    isTrackMode,
    onEdit,
    onDelete,
}) => {
    return (
        <div className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-3 group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${categoryInfo?.color || 'bg-slate-400'}`}>
                <span className="material-symbols-outlined text-xl">{categoryInfo?.icon || 'payments'}</span>
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-sunset-dark text-sm truncate">{expense.description}</p>
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] text-sunset-muted">
                        {isTrackMode ? (
                            new Date(expense.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                        ) : (
                            <>{payer?.name?.split(' ')[0]} pagou • {expense.participants.length} pessoas</>
                        )}
                    </p>
                    {expense.paymentMethod === 'installment' && expense.installment && (
                        <span className="bg-amber-100 text-amber-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                            {expense.installment.paid}/{expense.installment.total} pagas
                        </span>
                    )}
                    {expense.receiptUrl && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(expense.receiptUrl, '_blank'); }}
                            className="flex items-center gap-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-bold px-1.5 py-0.5 rounded-full hover:bg-emerald-200 transition-colors active:scale-95"
                        >
                            <span className="material-symbols-outlined text-[10px]">image</span>
                            RECIBO
                        </button>
                    )}
                </div>
            </div>
            <div className="text-right">
                <p className="font-bold text-terracotta-600">R$ {expense.amount.toFixed(2)}</p>
                <p className="text-[9px] text-sunset-muted">
                    {expense.paymentMethod === 'installment' && expense.installment ? (
                        <>{expense.installment.total}x R$ {(expense.installment.amount / (isTrackMode ? 1 : expense.participants.length)).toFixed(2)}{!isTrackMode && '/pessoa'}</>
                    ) : isTrackMode ? (
                        categoryInfo?.label || expense.category
                    ) : (
                        <>R$ {(expense.amount / expense.participants.length).toFixed(2)}/pessoa</>
                    )}
                </p>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(expense); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-terracotta-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-terracotta-50"
                >
                    <span className="material-symbols-outlined text-lg">edit</span>
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                    <span className="material-symbols-outlined text-lg">delete</span>
                </button>
            </div>
        </div>
    );
};

export default ExpenseCard;
