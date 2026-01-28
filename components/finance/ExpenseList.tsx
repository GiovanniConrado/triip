import React from 'react';
import { Expense, Participant } from '../../types';
import ExpenseCard from './ExpenseCard';

interface CategoryInfo {
    id: string;
    icon: string;
    label: string;
    color?: string;
}

interface ExpenseListProps {
    expenses: Expense[];
    participants: Participant[];
    categories: CategoryInfo[];
    isTrackMode: boolean;
    onEdit: (expense: Expense) => void;
    onDelete: (expenseId: string) => void;
    onAddClick: () => void;
    onView?: (expense: Expense) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
    expenses,
    participants,
    categories,
    isTrackMode,
    onEdit,
    onDelete,
    onAddClick,
    onView,
}) => {
    return (
        <>
            {/* Add Expense Button */}
            <button
                onClick={onAddClick}
                className="w-full h-12 bg-terracotta-50 border-2 border-dashed border-terracotta-200 rounded-2xl flex items-center justify-center gap-2 text-terracotta-500 font-bold mb-4 hover:bg-terracotta-100 transition-colors active:scale-[0.98]"
            >
                <span className="material-symbols-outlined">add</span>
                Adicionar Despesa
            </button>

            {expenses.length === 0 ? (
                <div className="bg-white/50 rounded-3xl p-8 border border-dashed border-terracotta-200 text-center">
                    <span className="material-symbols-outlined text-5xl text-terracotta-200">receipt_long</span>
                    <p className="font-bold text-sunset-muted mt-3">Nenhuma despesa</p>
                    <p className="text-xs text-sunset-muted mt-1">Adicione a primeira despesa da viagem</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {[...expenses].reverse().map(expense => {
                        const payer = participants.find(p => p.id === expense.paidBy);
                        const categoryInfo = categories.find(c => c.id === expense.category);

                        return (
                            <ExpenseCard
                                key={expense.id}
                                expense={expense}
                                payer={payer}
                                categoryInfo={categoryInfo}
                                isTrackMode={isTrackMode}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onClick={onView}
                            />
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default ExpenseList;
