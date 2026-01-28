import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Trip, Expense, Participant } from '../types';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import ExpenseList from '../components/finance/ExpenseList';
import BalanceList from '../components/finance/BalanceList';
import SettlementList from '../components/finance/SettlementList';
import ParticipantList from '../components/finance/ParticipantList';
import Toast from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import LoadingButton from '../components/LoadingButton';
import ImageUpload from '../components/ImageUpload';

const CATEGORIES = [
    { id: 'Todos', icon: 'dashboard', label: 'Todos', color: 'bg-sunset-dark' },
    { id: 'Alimentação', icon: 'restaurant', label: 'Alimentar', color: 'bg-emerald-500' },
    { id: 'Transporte', icon: 'directions_car', label: 'Transp.', color: 'bg-blue-500' },
    { id: 'Hospedagem', icon: 'bed', label: 'Hospedar', color: 'bg-purple-500' },
    { id: 'Passeios', icon: 'explore', label: 'Passeio', color: 'bg-amber-500' },
    { id: 'Outros', icon: 'more_horiz', label: 'Outros', color: 'bg-slate-500' },
];

const Finance = () => {
    const { tripId } = useParams();
    const navigate = useNavigate();
    const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'balances' | 'settle' | 'participants'>('overview');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
    const [showPastTrips, setShowPastTrips] = useState(false);
    const [trips, setTrips] = useState<Trip[]>([]);

    // State for new expense
    const [showAddExpense, setShowAddExpense] = useState(false);
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState<string>('Outros'); // Default
    const [paidBy, setPaidBy] = useState<string>('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [receiptUrl, setReceiptUrl] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for settings
    const [showSettings, setShowSettings] = useState(false);
    const [optimizeTransfers, setOptimizeTransfers] = useState(() => localStorage.getItem('triip_optimize_transfers') === 'true');
    const [settledPayments, setSettledPayments] = useState<string[]>([]); // Settlement IDs that are paid

    // State for participant management
    const [showAddExternal, setShowAddExternal] = useState(false);
    const [externalName, setExternalName] = useState('');
    const [mergingParticipant, setMergingParticipant] = useState<Participant | null>(null);

    // State for Editing
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editPaidBy, setEditPaidBy] = useState('');
    const [editParticipants, setEditParticipants] = useState<string[]>([]);
    const [editReceiptUrl, setEditReceiptUrl] = useState<string>('');
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

    // State for Installments
    const [editInstallmentEnabled, setEditInstallmentEnabled] = useState(false);
    const [editInstallmentTotal, setEditInstallmentTotal] = useState('2');
    const [editInstallmentPaid, setEditInstallmentPaid] = useState('0');
    const [editInstallmentFirstDate, setEditInstallmentFirstDate] = useState('');

    const [suggestions, setSuggestions] = useState<any[]>([]); // For validation when removing participant
    const [isAdmin, setIsAdmin] = useState(false);
    const [viewingExpense, setViewingExpense] = useState<Expense | null>(null);
    const [showReceiptFull, setShowReceiptFull] = useState(false);

    useEffect(() => {
        const loadTrip = async () => {
            if (tripId) {
                const trip = await storageService.getTripById(tripId);
                const exps = await storageService.getExpensesByTrip(tripId);
                const allSugg = await storageService.getSuggestionsByTrip(tripId);
                const storedSettled = JSON.parse(localStorage.getItem(`triip_settled_${tripId}`) || '[]');

                // Check Admin
                const adminStatus = await storageService.isAdmin(tripId);
                setIsAdmin(adminStatus);

                if (trip) {
                    setCurrentTrip(trip);
                    setExpenses(exps);
                    setSuggestions(allSugg);
                    setSettledPayments(storedSettled);
                    if (trip.participants.length > 0) {
                        setPaidBy(trip.participants[0].id);
                        setSelectedParticipants(trip.participants.map(p => p.id));
                    }
                }
            } else {
                // Load trip list for selection
                const all = await storageService.getTrips();
                setTrips(all);
            }
        };
        loadTrip();
    }, [tripId]);

    // Mode Detection: "Track" (Personal/Couple) vs "Split" (Group)
    // Heuristic: If all expenses are split equally among ALL participants, it's more like tracking.
    // If there are specific splits or uneven balances, it's group split.
    // Simple heuristic: If participants > 2, default to Split view being prominent.
    const isTrackMode = useMemo(() => {
        if (!currentTrip) return false;
        return currentTrip.participants.length <= 2;
    }, [currentTrip]);

    const filteredTrips = trips.filter(t => showPastTrips || t.status !== 'past');

    const filteredExpenses = expenses
        .filter(e => !categoryFilter || e.category === categoryFilter)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingCount = useMemo(() => {
        // ... (existing logic for pending count) - simplified for rewrite
        if (isTrackMode) return 0; // Simplified
        return 0; // Recalculated in SettlementList usually
    }, [expenses, isTrackMode]);

    // Calculations
    const balances = useMemo(() => {
        if (!currentTrip) return [];

        const bals: { [key: string]: number } = {};
        currentTrip.participants.forEach(p => bals[p.id] = 0);

        expenses.forEach(e => {
            const payer = e.paidBy;
            const amount = e.amount;
            const splitAmong = e.participants || [];

            if (splitAmong.length > 0) {
                const share = amount / splitAmong.length;
                bals[payer] = (bals[payer] || 0) + amount;
                splitAmong.forEach(pId => {
                    bals[pId] = (bals[pId] || 0) - share;
                });
            } else {
                // Entirely for self? No debt.
            }
        });

        return Object.entries(bals)
            .map(([id, balance]) => {
                const p = currentTrip.participants.find(p => p.id === id);
                return p ? { ...p, balance } : null;
            })
            .filter((p): p is Participant & { balance: number } => p !== null)
            .sort((a, b) => b.balance - a.balance);
    }, [currentTrip, expenses]);

    const settlements = useMemo(() => {
        // Copy of balances to mutate
        let currentBalances = balances.map(b => ({ ...b }));
        const debts: { id: string; from: string; to: string; amount: number; description: string }[] = [];

        // Optimize transfers?
        if (optimizeTransfers) {
            // Sort by balance
            // Simple algorithm: take biggest debtor and biggest creditor and match them
            let debtors = currentBalances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
            let creditors = currentBalances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

            let safe = 0;
            while (debtors.length > 0 && creditors.length > 0 && safe < 50) {
                safe++;
                const debtor = debtors[0];
                const creditor = creditors[0];

                const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

                debts.push({
                    id: `${debtor.id}-${creditor.id}-${safe}`, // Stable-ish ID
                    from: debtor.id,
                    to: creditor.id,
                    amount,
                    description: 'Otimizado'
                });

                debtor.balance += amount;
                creditor.balance -= amount;

                if (Math.abs(debtor.balance) < 0.01) debtors.shift();
                if (creditor.balance < 0.01) creditors.shift();
            }
        } else {
            // Simple mode: Direct debts based on expenses (complex to reconstructing without graph, falling back to optimized for now as default)
            // Simulating non-optimized: (Actually the simple algorithm IS the optimized one basically).
            // Use same logic for now.
            let debtors = currentBalances.filter(b => b.balance < -0.01).sort((a, b) => a.balance - b.balance);
            let creditors = currentBalances.filter(b => b.balance > 0.01).sort((a, b) => b.balance - a.balance);

            let safe = 0;
            while (debtors.length > 0 && creditors.length > 0 && safe < 50) {
                safe++;
                const debtor = debtors[0];
                const creditor = creditors[0];
                const amount = Math.min(Math.abs(debtor.balance), creditor.balance);
                debts.push({
                    id: `${debtor.id}-${creditor.id}-${safe}`,
                    from: debtor.id,
                    to: creditor.id,
                    amount,
                    description: 'Pagamento'
                });
                debtor.balance += amount;
                creditor.balance -= amount;
                if (Math.abs(debtor.balance) < 0.01) debtors.shift();
                if (creditor.balance < 0.01) creditors.shift();
            }
        }
        return debts.map(debt => {
            const fromP = currentTrip.participants.find(p => p.id === debt.from) || {
                id: debt.from,
                name: 'Participante',
                avatar: `https://ui-avatars.com/api/?name=P&background=random`
            };
            const toP = currentTrip.participants.find(p => p.id === debt.to) || {
                id: debt.to,
                name: 'Participante',
                avatar: `https://ui-avatars.com/api/?name=P&background=random`
            };

            return {
                ...debt,
                from: fromP,
                to: toP
            };
        });
    }, [currentTrip, balances, optimizeTransfers]);

    // Installment stats
    const installmentExpenses = expenses.filter(e => e.paymentMethod === 'installment' && e.installment);
    const pendingInstallments = installmentExpenses.reduce((sum, e) => {
        if (e.installment) return sum + (e.installment.total - e.installment.paid);
        return sum;
    }, 0);

    // Handlers
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        // Validation: Only Amount, Description and PaidBy are strict mandatory. 
        if (!tripId || !amount || !description || !paidBy) {
            setToast({ message: 'Preencha Nome, Valor e Quem Pagou', type: 'error' });
            return;
        }

        const expenseParticipants = selectedParticipants.length > 0 ? selectedParticipants : [paidBy];

        const newExpense: Omit<Expense, 'id'> = {
            tripId,
            amount: parseFloat(amount),
            description,
            category: (category as any) || 'Outros',
            paidBy,
            participants: expenseParticipants,
            status: 'pending',
            date: new Date().toISOString(),
            receiptUrl: receiptUrl || undefined,
            paymentMethod: editInstallmentEnabled ? 'installment' : 'cash',
            installment: editInstallmentEnabled ? {
                total: parseInt(editInstallmentTotal) || 2,
                paid: 0,
                firstDueDate: editInstallmentFirstDate || new Date().toISOString().split('T')[0],
                amount: parseFloat(amount) / (parseInt(editInstallmentTotal) || 2)
            } : undefined,
        };

        setIsSubmitting(true);
        try {
            const created = await storageService.createExpense(newExpense);
            if (created) {
                setToast({ message: 'Despesa adicionada!', type: 'success' });
                setShowAddExpense(false);
                const updatedExpenses = await storageService.getExpensesByTrip(tripId);
                setExpenses(updatedExpenses);
                setAmount('');
                setDescription('');
                setReceiptUrl('');
                // Reset to default payer (first one) or keep last used? Resetting is safer.
                if (currentTrip?.participants[0]) {
                    setPaidBy(currentTrip.participants[0].id);
                }
            }
        } catch (error: any) {
            console.error('Error adding expense:', error);
            setToast({ message: error.message || 'Erro ao adicionar despesa.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteExpense = (expenseId: string) => {
        setExpenseToDelete(expenseId);
    };

    const confirmDeleteExpense = async () => {
        if (!expenseToDelete || !tripId) return;
        setIsSubmitting(true);
        try {
            const success = await storageService.deleteExpense(expenseToDelete);
            if (success) {
                const updatedExpenses = await storageService.getExpensesByTrip(tripId);
                setExpenses(updatedExpenses);
                setToast({ message: 'Despesa removida', type: 'info' });
            }
            setExpenseToDelete(null);
        } catch (error: any) {
            console.error('Error deleting expense:', error);
            setToast({ message: error.message || 'Erro ao remover despesa.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddExternalParticipant = async () => {
        if (!currentTrip || !externalName.trim()) return;

        setIsSubmitting(true);
        try {
            const newParticipant = await storageService.addParticipantToTrip(currentTrip.id, {
                name: externalName.trim(),
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(externalName.trim())}&background=random`,
                isExternal: true,
            });

            if (newParticipant) {
                const updatedTrip = await storageService.getTripById(currentTrip.id);
                setCurrentTrip(updatedTrip);
                setSelectedParticipants([...selectedParticipants, newParticipant.id]);
                setExternalName('');
                setShowAddExternal(false);
                setToast({ message: `${newParticipant.name} adicionado!`, type: 'success' });
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!currentTrip) return;

        // Check if participant has expenses
        const hasConfirmedSuggestions = suggestions.some(s => s.confirmedBy === participantId);
        if (hasConfirmedSuggestions) {
            setToast({ message: 'Não é possível remover: este participante confirmou sugestões no roteiro.', type: 'error' });
            return;
        }

        if (confirm('Tem certeza que deseja remover este participante?')) {
            const result = await storageService.removeParticipantFromTrip(participantId);
            if (result.success) {
                const updatedTrip = await storageService.getTripById(currentTrip.id, true);
                setCurrentTrip(updatedTrip);
                setToast({ message: 'Participante removido', type: 'info' });
            } else {
                setToast({ message: result.error || 'Erro ao remover participante.', type: 'error' });
            }
        }
    };

    const handleSettlePayment = (settlementId: string) => {
        // Optimistic Update: Add to settled list immediately
        const previousSettled = [...settledPayments];
        const updated = [...settledPayments, settlementId];
        setSettledPayments(updated);
        localStorage.setItem(`triip_settled_${tripId}`, JSON.stringify(updated));
        setToast({ message: 'Pagamento quitado! ✅', type: 'success' });
    };

    const handleToggleOptimize = (value: boolean) => {
        setOptimizeTransfers(value);
        localStorage.setItem('triip_optimize_transfers', String(value));
        setToast({ message: value ? 'Transferências otimizadas!' : 'Modo simples ativado', type: 'info' });
    };

    const handleOpenEditExpense = (expense: Expense) => {
        setEditingExpense(expense);
        setEditAmount(expense.amount.toString());
        setEditDescription(expense.description || '');
        setEditCategory(expense.category);
        setEditPaidBy(expense.paidBy);
        setEditParticipants(expense.participants || []);
        setEditInstallmentEnabled(expense.paymentMethod === 'installment');
        setEditInstallmentTotal(expense.installment?.total.toString() || '2');
        setEditInstallmentPaid(expense.installment?.paid.toString() || '0');
        setEditInstallmentFirstDate(expense.installment?.firstDueDate || '');
        setEditReceiptUrl(expense.receiptUrl || '');
    };

    const handleSaveEditExpense = async () => {
        if (!editingExpense || !tripId) return;

        const updates: Partial<Expense> = {
            amount: parseFloat(editAmount),
            description: editDescription,
            category: editCategory as any,
            paidBy: editPaidBy,
            participants: editParticipants,
            receiptUrl: editReceiptUrl,
            paymentMethod: editInstallmentEnabled ? 'installment' : 'cash',
            installment: editInstallmentEnabled ? {
                total: parseInt(editInstallmentTotal) || 2,
                paid: parseInt(editInstallmentPaid) || 0,
                firstDueDate: editInstallmentFirstDate || new Date().toISOString().split('T')[0],
                amount: parseFloat(editAmount) / (parseInt(editInstallmentTotal) || 2)
            } : undefined,
        };

        setIsSubmitting(true);
        try {
            const updated = await storageService.updateExpense(editingExpense.id, updates);
            if (updated) {
                const updatedExpenses = await storageService.getExpensesByTrip(tripId);
                setExpenses(updatedExpenses);
                setEditParticipants([]);
                setEditingExpense(null);
                setToast({ message: 'Alterações salvas! ✅', type: 'success' });
            }
        } catch (error: any) {
            console.error('Error saving expense:', error);
            setToast({ message: error.message || 'Erro ao salvar alterações.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePayInstallment = async (expense: Expense) => {
        if (!expense.installment || !tripId) return;

        const newPaid = Math.min(expense.installment.paid + 1, expense.installment.total);

        // Optimistic UI Update
        const previousExpenses = [...expenses];
        setExpenses(prev => prev.map(e =>
            e.id === expense.id
                ? { ...e, installment: { ...e.installment!, paid: newPaid } }
                : e
        ));

        try {
            const updated = await storageService.updateExpense(expense.id, {
                installment: { ...expense.installment, paid: newPaid }
            });
            if (updated) {
                setToast({ message: `Parcela ${newPaid}/${expense.installment.total} marcada como paga!`, type: 'success' });
            } else {
                throw new Error('Update failed');
            }
        } catch (error) {
            // Revert on error
            setExpenses(previousExpenses);
            setToast({ message: 'Erro ao pagar parcela. Revertendo...', type: 'error' });
        }
    };

    const handleMergeParticipants = async (targetId: string) => {
        if (!mergingParticipant || !tripId) return;

        setIsSubmitting(true);
        try {
            const success = await storageService.mergeParticipants(mergingParticipant.id, targetId);
            if (success) {
                const updatedTrip = await storageService.getTripById(tripId);
                const updatedExpenses = await storageService.getExpensesByTrip(tripId);
                setCurrentTrip(updatedTrip);
                setExpenses(updatedExpenses);
                setMergingParticipant(null);
                setToast({ message: 'Participantes mesclados com sucesso! 🤝', type: 'success' });
            } else {
                setToast({
                    message: 'Erro ao mesclar participantes. Verifique se existem referências pendentes.',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Merge error:', error);
            setToast({ message: 'Erro crítico ao processar mesclagem.', type: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    // If no trip selected, show trip selection
    if (!tripId) {
        return (
            <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

                <header className="sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md px-6 pt-14 pb-4 border-b border-terracotta-100">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="flex items-center justify-center transition-transform active:scale-90"
                            >
                                <span className="material-symbols-outlined text-2xl text-sunset-dark">menu</span>
                            </button>
                            <div>
                                <h1 className="text-2xl font-black tracking-tight text-sunset-dark">Finanças</h1>
                                <p className="text-sunset-muted text-xs">Gerencie os gastos das viagens</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSettings(true)}
                            className="w-10 h-10 rounded-full bg-white border border-terracotta-100 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-sunset-dark">settings</span>
                        </button>
                    </div>

                    {/* Toggle Past Trips */}
                    <div className="flex items-center justify-between bg-white rounded-2xl p-3 border border-terracotta-100 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-terracotta-500">filter_list</span>
                            <span className="text-sm font-bold text-sunset-dark">Incluir viagens passadas</span>
                        </div>
                        <button
                            onClick={() => setShowPastTrips(!showPastTrips)}
                            className={`w-12 h-6 rounded-full transition-all ${showPastTrips ? 'bg-terracotta-500' : 'bg-terracotta-100'}`}
                        >
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${showPastTrips ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                        </button>
                    </div>
                </header>

                <main className="flex-1 px-6 py-4 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-sunset-muted flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">flight</span>
                        Selecione uma viagem
                    </h3>

                    {filteredTrips.length === 0 ? (
                        <div className="bg-white/50 rounded-3xl p-8 border border-dashed border-terracotta-200 text-center">
                            <span className="material-symbols-outlined text-5xl text-terracotta-200">flight_takeoff</span>
                            <p className="font-bold text-sunset-muted mt-3">Nenhuma viagem confirmada</p>
                            <p className="text-xs text-sunset-muted mt-1">Confirme uma viagem para gerenciar as finanças</p>
                            <button
                                onClick={() => navigate('/trips')}
                                className="mt-4 px-6 py-2 bg-terracotta-500 text-white font-bold text-sm rounded-xl active:scale-95 transition-all"
                            >
                                Ver Viagens
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTrips.map(trip => {
                                const tripTotal = (trip.expenses || []).reduce((sum, e) => sum + e.amount, 0);

                                return (
                                    <button
                                        key={trip.id}
                                        onClick={() => navigate(`/finance/${trip.id}`)}
                                        className="w-full bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-all"
                                    >
                                        <img
                                            src={trip.imageUrl}
                                            alt={trip.title}
                                            className="w-14 h-14 rounded-xl object-cover"
                                        />
                                        <div className="flex-1 text-left">
                                            <div className="flex items-center gap-2">
                                                <p className="font-bold text-sunset-dark">{trip.title}</p>
                                                {trip.status === 'past' && (
                                                    <span className="bg-sunset-muted text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                                        PASSADA
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-sunset-muted">{trip.destination} • {trip.participants.length} pessoas</p>
                                            <p className="text-xs font-bold text-terracotta-600 mt-1">
                                                R$ {tripTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <span className="material-symbols-outlined text-terracotta-300">chevron_right</span>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </main>

                <BottomNav />
            </div>
        );
    }

    // Trip Finance View
    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Header */}
            <header className="sticky top-0 z-30 bg-warm-cream/95 backdrop-blur-md px-6 pt-14 pb-4 border-b border-terracotta-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/finance')}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-terracotta-100 shadow-sm active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined text-sunset-dark">arrow_back</span>
                        </button>
                        <div>
                            <h1 className="text-lg font-black tracking-tight text-sunset-dark">{currentTrip?.title}</h1>
                            <p className="text-[10px] text-sunset-muted">{currentTrip?.participants.length} participantes</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="w-10 h-10 rounded-full bg-white border border-terracotta-100 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
                    >
                        <span className="material-symbols-outlined text-sunset-dark">settings</span>
                    </button>
                </div>

                {/* Summary Cards */}
                {activeTab !== 'overview' && (
                    <div className="grid grid-cols-3 gap-2 mb-4 animate-fade-in">
                        <div className="bg-white rounded-2xl p-3 text-center border border-terracotta-100 shadow-sm">
                            <span className="text-lg font-black text-terracotta-600">R$ {totalSpent.toFixed(0)}</span>
                            <p className="text-[9px] text-sunset-muted uppercase tracking-wider">Total</p>
                        </div>
                        {isTrackMode ? (
                            <>
                                <div className="bg-white rounded-2xl p-3 text-center border border-terracotta-100 shadow-sm">
                                    <span className="text-lg font-black text-sunset-dark">{expenses.length}</span>
                                    <p className="text-[9px] text-sunset-muted uppercase tracking-wider">Despesas</p>
                                </div>
                                <div className="bg-white rounded-2xl p-3 text-center border border-terracotta-100 shadow-sm">
                                    <span className={`text-lg font-black ${pendingInstallments > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {pendingInstallments}
                                    </span>
                                    <p className="text-[9px] text-sunset-muted uppercase tracking-wider">Parcelas</p>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="bg-white rounded-2xl p-3 text-center border border-terracotta-100 shadow-sm">
                                    <span className="text-lg font-black text-sunset-dark">
                                        R$ {currentTrip ? (totalSpent / currentTrip.participants.length).toFixed(0) : 0}
                                    </span>
                                    <p className="text-[9px] text-sunset-muted uppercase tracking-wider">Por pessoa</p>
                                </div>
                                <div className="bg-white rounded-2xl p-3 text-center border border-terracotta-100 shadow-sm">
                                    <span className={`text-lg font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        {pendingCount}
                                    </span>
                                    <p className="text-[9px] text-sunset-muted uppercase tracking-wider">Pendentes</p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Mode Badge */}
                <div className={`mb-4 px-3 py-2 rounded-xl flex items-center gap-2 ${isTrackMode ? 'bg-blue-50 border border-blue-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <span className={`material-symbols-outlined text-lg ${isTrackMode ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {isTrackMode ? 'account_balance_wallet' : 'payments'}
                    </span>
                    <p className={`text-[10px] font-bold ${isTrackMode ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {isTrackMode ? 'Modo Controle: Pessoal' : 'Modo Divisão: Grupo'}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-terracotta-100/40 rounded-2xl">
                    {(isTrackMode ? [
                        { id: 'overview', label: 'Resumo', icon: 'dashboard' },
                        { id: 'expenses', label: 'Despesas', icon: 'receipt_long' },
                        { id: 'participants', label: 'Pessoas', icon: 'group' },
                    ] : [
                        { id: 'overview', label: 'Resumo', icon: 'dashboard' },
                        { id: 'expenses', label: 'Despesas', icon: 'receipt_long' },
                        { id: 'balances', label: 'Saldos', icon: 'account_balance_wallet' },
                        { id: 'settle', label: 'Acertar', icon: 'handshake' },
                        { id: 'participants', label: 'Pessoas', icon: 'group' },
                    ]).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex-1 py-2 text-[8px] font-extrabold uppercase tracking-tighter rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${activeTab === tab.id
                                ? 'bg-white text-terracotta-600 shadow-sm'
                                : 'text-sunset-muted'
                                }`}
                        >
                            <span className="material-symbols-outlined text-base">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            <main className="flex-1 px-6 py-4 space-y-4">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Main Stats Widget */}
                        <div className="bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-[32px] p-6 text-white shadow-xl shadow-terracotta-500/20">
                            <p className="text-xs font-bold opacity-80 uppercase tracking-widest mb-1">Total da Viagem</p>
                            <h2 className="text-4xl font-black mb-4">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>

                            <div className="grid grid-cols-2 gap-4 border-t border-white/20 pt-4">
                                <div>
                                    <p className="text-[10px] font-bold opacity-70 uppercase">Por Pessoa</p>
                                    <p className="text-lg font-black">R$ {(totalSpent / (currentTrip?.participants.length || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold opacity-70 uppercase">Acertos Pendentes</p>
                                    <p className="text-lg font-black">{pendingCount}</p>
                                </div>
                            </div>
                        </div>

                        {/* Category Breakdown */}
                        <div className="bg-white rounded-[28px] p-5 border border-terracotta-100 shadow-sm">
                            <h3 className="text-xs font-bold text-sunset-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">pie_chart</span>
                                Gastos por Categoria
                            </h3>
                            <div className="space-y-3">
                                {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => {
                                    const catTotal = expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0);
                                    const percentage = totalSpent > 0 ? (catTotal / totalSpent) * 100 : 0;
                                    if (catTotal === 0) return null;

                                    return (
                                        <div key={cat.id} className="space-y-1">
                                            <div className="flex justify-between items-center text-[11px] font-bold">
                                                <div className="flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-sm text-sunset-muted">{cat.icon}</span>
                                                    <span className="text-sunset-dark">{cat.label}</span>
                                                </div>
                                                <span className="text-terracotta-600">R$ {catTotal.toFixed(0)} ({percentage.toFixed(0)}%)</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-terracotta-50 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-terracotta-500 rounded-full transition-all duration-1000"
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Top Spender */}
                        {!isTrackMode && (
                            <div className="bg-white rounded-[28px] p-5 border border-terracotta-100 shadow-sm">
                                <h3 className="text-xs font-bold text-sunset-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">leaderboard</span>
                                    Quem mais gastou
                                </h3>
                                <div className="flex items-center gap-4">
                                    {balances.slice(0, 3).map((b, idx) => (
                                        <div key={b.id} className="flex flex-col items-center gap-1 flex-1">
                                            <div className="relative">
                                                <img src={b.avatar} className="w-12 h-12 rounded-full border-2 border-terracotta-100" />
                                                {idx === 0 && <span className="absolute -top-1 -right-1 text-base">👑</span>}
                                            </div>
                                            <span className="text-[10px] font-bold text-sunset-dark truncate w-full text-center">{b.name.split(' ')[0]}</span>
                                            <span className="text-[9px] font-bold text-terracotta-500">R$ {Math.abs(b.balance).toFixed(0)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setActiveTab('expenses')}
                            className="w-full py-4 bg-terracotta-50 text-terracotta-600 font-bold rounded-2xl text-xs active:scale-95 transition-all"
                        >
                            Ver Extrato Detalhado
                        </button>
                    </div>
                )}

                {/* EXPENSES TAB */}
                {activeTab === 'expenses' && (
                    <>
                        <div className="grid grid-cols-6 gap-1 mb-2">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategoryFilter(cat.id)}
                                    className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${categoryFilter === cat.id
                                        ? 'text-terracotta-600'
                                        : 'text-sunset-muted'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-xl mb-0.5 ${categoryFilter === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                        }`}>
                                        {cat.icon}
                                    </span>
                                    <span className={`text-[9px] font-bold ${categoryFilter === cat.id ? 'text-terracotta-600' : 'text-sunset-muted'
                                        }`}>
                                        {cat.label}
                                    </span>
                                    {categoryFilter === cat.id && (
                                        <div className="w-1 h-1 bg-terracotta-500 rounded-full mt-0.5"></div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <ExpenseList
                            expenses={filteredExpenses}
                            participants={currentTrip?.participants || []}
                            categories={CATEGORIES}
                            isTrackMode={isTrackMode}
                            onEdit={handleOpenEditExpense}
                            onDelete={handleDeleteExpense}
                            onAddClick={() => setShowAddExpense(true)}
                            onView={(exp) => setViewingExpense(exp)}
                        />
                    </>
                )}

                {/* BALANCES TAB */}
                {activeTab === 'balances' && (
                    <BalanceList balances={balances} expenses={expenses} />
                )}

                {/* SETTLE TAB */}
                {activeTab === 'settle' && (
                    <SettlementList
                        settlements={settlements}
                        settledPayments={settledPayments}
                        optimizeTransfers={optimizeTransfers}
                        onSettlePayment={handleSettlePayment}
                        expenses={expenses}
                        onPayInstallment={handlePayInstallment}
                    />
                )}

                {/* PARTICIPANTS TAB */}
                {activeTab === 'participants' && (
                    <ParticipantList
                        participants={currentTrip?.participants || []}
                        expenses={expenses}
                        onAddExternal={() => setShowAddExternal(true)}
                        onRemoveParticipant={handleRemoveParticipant}
                        onMergeParticipant={(p) => setMergingParticipant(p)}
                        isAdmin={isAdmin}
                    />
                )}
            </main>

            {/* Add Expense Modal */}
            {showAddExpense && (
                <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddExpense(false)}></div>
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Nova Despesa</h2>
                                <button onClick={() => setShowAddExpense(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleAddExpense} className="px-6 py-4 space-y-4">
                            {/* Amount */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Valor <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0,00"
                                        className="w-full h-14 pl-12 pr-4 bg-warm-cream border border-terracotta-100 rounded-2xl text-2xl font-black text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Nome do Item <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Ex: Jantar, Uber, Mercado..."
                                    className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-2xl text-sm font-medium text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                />
                            </div>

                            {/* Paid By - Select Dropdown */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Quem pagou? <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        value={paidBy}
                                        onChange={e => setPaidBy(e.target.value)}
                                        className="w-full h-12 pl-4 pr-10 bg-warm-cream border border-terracotta-100 rounded-2xl text-sm font-bold text-sunset-dark appearance-none focus:outline-none focus:ring-2 focus:ring-terracotta-500 !bg-none"
                                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                                    >
                                        <option value="" disabled>Selecione alguém...</option>
                                        {currentTrip?.participants.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.isExternal ? '(Externo)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-sunset-muted pointer-events-none">
                                        expand_more
                                    </span>
                                </div>
                            </div>

                            {/* Split Between - Grid List like QuickMenu */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider">
                                        Dividir com (Opcional)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (currentTrip) {
                                                const allIds = currentTrip.participants.map(p => p.id);
                                                if (selectedParticipants.length === allIds.length) {
                                                    setSelectedParticipants([]);
                                                } else {
                                                    setSelectedParticipants(allIds);
                                                }
                                            }
                                        }}
                                        className="text-[10px] font-bold text-terracotta-600 hover:underline px-2"
                                    >
                                        {currentTrip && selectedParticipants.length === currentTrip.participants.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    {currentTrip?.participants.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                if (selectedParticipants.includes(p.id)) {
                                                    setSelectedParticipants(prev => prev.filter(id => id !== p.id));
                                                } else {
                                                    setSelectedParticipants(prev => [...prev, p.id]);
                                                }
                                            }}
                                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${selectedParticipants.includes(p.id)
                                                ? 'bg-terracotta-50 border-terracotta-200 text-terracotta-700'
                                                : 'bg-white border-terracotta-100 text-sunset-muted'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${selectedParticipants.includes(p.id)
                                                ? 'bg-terracotta-500 border-terracotta-500 text-white'
                                                : 'border-terracotta-200 bg-white'
                                                }`}>
                                                {selectedParticipants.includes(p.id) && <span className="material-symbols-outlined text-[10px] font-black">check</span>}
                                            </div>
                                            <img src={p.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                            <span className="text-xs font-bold truncate">{p.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10px] text-sunset-muted mt-2 ml-1 italic opacity-70">
                                    * Se ninguém for selecionado, o valor será atribuído apenas a quem pagou.
                                </p>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Categoria
                                </label>
                                <div className="grid grid-cols-6 gap-2">
                                    {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${category === cat.id
                                                ? 'text-terracotta-600 bg-terracotta-50 ring-1 ring-terracotta-200 shadow-sm'
                                                : 'text-sunset-muted hover:bg-warm-cream border border-transparent'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-xl mb-0.5">{cat.icon}</span>
                                            <span className="text-[9px] font-bold">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Installments logic missing here - Adding it to match QuickActionsMenu */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-4 bg-warm-cream rounded-2xl border border-terracotta-100 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="material-symbols-outlined text-terracotta-500">credit_card</span>
                                        <span className="text-sm font-bold text-sunset-dark">Compra parcelada?</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setEditInstallmentEnabled(!editInstallmentEnabled)}
                                        className={`w-12 h-6 rounded-full transition-all ${editInstallmentEnabled ? 'bg-terracotta-500' : 'bg-terracotta-100'}`}
                                    >
                                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${editInstallmentEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                    </button>
                                </div>

                                {editInstallmentEnabled && (
                                    <div className="space-y-4 animate-fade-in p-4 bg-terracotta-50/30 rounded-2xl border border-terracotta-100">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 block">Nº de Parcelas</label>
                                                <input
                                                    type="number"
                                                    value={editInstallmentTotal}
                                                    onChange={e => setEditInstallmentTotal(e.target.value)}
                                                    className="w-full h-11 px-4 bg-white border border-terracotta-100 rounded-xl text-sm font-bold text-sunset-dark"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 block">Já pagas</label>
                                                <input
                                                    type="number"
                                                    value={editInstallmentPaid}
                                                    onChange={e => setEditInstallmentPaid(e.target.value)}
                                                    className="w-full h-11 px-4 bg-white border border-terracotta-100 rounded-xl text-sm font-bold text-sunset-dark"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 block">Data da 1ª Parcela</label>
                                            <input
                                                type="date"
                                                value={editInstallmentFirstDate}
                                                onChange={e => setEditInstallmentFirstDate(e.target.value)}
                                                className="w-full h-11 px-4 bg-white border border-terracotta-100 rounded-xl text-sm font-bold text-sunset-dark"
                                            />
                                        </div>
                                        {editInstallmentTotal && amount && (
                                            <div className="pt-2 border-t border-terracotta-100 flex justify-between items-center text-[10px]">
                                                <span className="text-sunset-muted uppercase font-bold tracking-wider">Valor por parcela</span>
                                                <span className="text-terracotta-600 font-black">R$ {(parseFloat(amount.replace(',', '.')) / (parseInt(editInstallmentTotal) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Receipt Upload */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">
                                    Foto do Comprovante (Opcional)
                                </label>
                                <ImageUpload
                                    folder="receipts"
                                    currentImage={receiptUrl}
                                    onImageChange={setReceiptUrl}
                                    placeholder="Anexar Comprovante"
                                    className="h-32"
                                    noCrop={true}
                                />
                            </div>

                            <LoadingButton
                                type="submit"
                                isLoading={isSubmitting}
                                loadingText="Adicionando..."
                                className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30"
                            >
                                <span className="material-symbols-outlined">add</span>
                                Adicionar Item
                            </LoadingButton>
                        </form>
                    </div>
                </div>
            )}

            {/* Add External Modal */}
            {showAddExternal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddExternal(false)}></div>
                    <div className="relative w-full bg-white rounded-3xl shadow-2xl p-6">
                        <h2 className="text-xl font-bold mb-4">Adicionar Pessoa Externa</h2>
                        <input
                            type="text"
                            value={externalName}
                            onChange={e => setExternalName(e.target.value)}
                            placeholder="Nome da pessoa"
                            className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-2xl text-sm font-medium text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500 mb-4"
                        />
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowAddExternal(false)}
                                className="flex-1 h-12 bg-terracotta-50 text-terracotta-600 font-bold rounded-2xl"
                            >
                                Cancelar
                            </button>
                            <LoadingButton
                                onClick={handleAddExternalParticipant}
                                isLoading={isSubmitting}
                                loadingText="Adicionando..."
                                disabled={!externalName.trim()}
                                className="flex-1 h-12 bg-terracotta-500 text-white font-bold rounded-2xl"
                            >
                                Adicionar
                            </LoadingButton>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}></div>
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl">
                        <div className="px-6 py-4 border-b border-terracotta-100">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Configurações</h2>
                                <button onClick={() => setShowSettings(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-warm-cream rounded-2xl border border-terracotta-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-600">compress</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-sunset-dark text-sm">Minimizar transferências</p>
                                        <p className="text-[10px] text-sunset-muted">Agrupa dívidas para menos pagamentos</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleToggleOptimize(!optimizeTransfers)}
                                    className={`w-12 h-6 rounded-full transition-all ${optimizeTransfers ? 'bg-emerald-500' : 'bg-terracotta-100'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${optimizeTransfers ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Expense Modal */}
            {editingExpense && (
                <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingExpense(null)}></div>
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4 z-10">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold">Editar Despesa</h2>
                                <button onClick={() => setEditingExpense(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-4 space-y-4">
                            {/* Amount */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Valor</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sunset-muted font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editAmount}
                                        onChange={e => setEditAmount(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-warm-cream border border-terracotta-100 rounded-2xl text-2xl font-black text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                    />
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Descrição</label>
                                <input
                                    type="text"
                                    value={editDescription}
                                    onChange={e => setEditDescription(e.target.value)}
                                    className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-2xl text-sm font-medium text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                />
                            </div>

                            {/* Paid By */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Quem pagou?</label>
                                <div className="relative">
                                    <select
                                        value={editPaidBy}
                                        onChange={e => setEditPaidBy(e.target.value)}
                                        className="w-full h-12 pl-4 pr-10 bg-warm-cream border border-terracotta-100 rounded-2xl text-sm font-bold text-sunset-dark appearance-none focus:outline-none focus:ring-2 focus:ring-terracotta-500 !bg-none"
                                        style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                                    >
                                        {currentTrip?.participants.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-sunset-muted pointer-events-none">expand_more</span>
                                </div>
                            </div>

                            {/* Split Between (Edit Mode) */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest">Dividir com</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (currentTrip) {
                                                const allIds = currentTrip.participants.map(p => p.id);
                                                if (editParticipants.length === allIds.length) {
                                                    setEditParticipants([]);
                                                } else {
                                                    setEditParticipants(allIds);
                                                }
                                            }
                                        }}
                                        className="text-[10px] font-bold text-terracotta-500 uppercase px-2"
                                    >
                                        {currentTrip && editParticipants.length === currentTrip.participants.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {currentTrip?.participants.map(p => (
                                        <button
                                            key={p.id}
                                            type="button"
                                            onClick={() => {
                                                if (editParticipants.includes(p.id)) {
                                                    setEditParticipants(prev => prev.filter(id => id !== p.id));
                                                } else {
                                                    setEditParticipants(prev => [...prev, p.id]);
                                                }
                                            }}
                                            className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${editParticipants.includes(p.id)
                                                ? 'bg-terracotta-50 border-terracotta-200 text-terracotta-700'
                                                : 'bg-white border-terracotta-100 text-sunset-muted'
                                                }`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${editParticipants.includes(p.id)
                                                ? 'bg-terracotta-500 border-terracotta-500 text-white'
                                                : 'border-terracotta-200 bg-white'
                                                }`}>
                                                {editParticipants.includes(p.id) && <span className="material-symbols-outlined text-[10px] font-black">check</span>}
                                            </div>
                                            <img src={p.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                            <span className="text-xs font-bold truncate">{p.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Categoria</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setEditCategory(cat.id)}
                                            className={`flex flex-col items-center justify-center py-2 rounded-xl transition-all ${editCategory === cat.id
                                                ? 'text-terracotta-600 bg-terracotta-50 ring-1 ring-terracotta-200'
                                                : 'text-sunset-muted hover:bg-warm-cream'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-xl mb-0.5">{cat.icon}</span>
                                            <span className="text-[9px] font-bold">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Installments Toggle */}
                            <div className="flex items-center justify-between p-4 bg-warm-cream rounded-2xl border border-terracotta-100">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-terracotta-500">credit_card</span>
                                    <span className="text-sm font-bold text-sunset-dark">Compra parcelada?</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditInstallmentEnabled(!editInstallmentEnabled)}
                                    className={`w-12 h-6 rounded-full transition-all ${editInstallmentEnabled ? 'bg-terracotta-500' : 'bg-terracotta-100'}`}
                                >
                                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${editInstallmentEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
                                </button>
                            </div>

                            {editInstallmentEnabled && (
                                <div className="space-y-4 animate-fade-in p-4 bg-terracotta-50/30 rounded-2xl border border-terracotta-100">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 block">Nº de Parcelas</label>
                                            <input
                                                type="number"
                                                value={editInstallmentTotal}
                                                onChange={e => setEditInstallmentTotal(e.target.value)}
                                                className="w-full h-11 px-4 bg-white border border-terracotta-100 rounded-xl text-sm font-bold text-sunset-dark"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 block">Já pagas</label>
                                            <input
                                                type="number"
                                                value={editInstallmentPaid}
                                                onChange={e => setEditInstallmentPaid(e.target.value)}
                                                className="w-full h-11 px-4 bg-white border border-terracotta-100 rounded-xl text-sm font-bold text-sunset-dark"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-2 block">Data da 1ª Parcela</label>
                                        <input
                                            type="date"
                                            value={editInstallmentFirstDate}
                                            onChange={e => setEditInstallmentFirstDate(e.target.value)}
                                            className="w-full h-11 px-4 bg-white border border-terracotta-100 rounded-xl text-sm font-bold text-sunset-dark"
                                        />
                                    </div>
                                    {editInstallmentTotal && editAmount && (
                                        <div className="pt-2 border-t border-terracotta-100 flex justify-between items-center text-[10px]">
                                            <span className="text-sunset-muted uppercase font-bold tracking-wider">Valor por parcela</span>
                                            <span className="text-terracotta-600 font-black">R$ {(parseFloat(editAmount.replace(',', '.')) / (parseInt(editInstallmentTotal) || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Receipt */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Comprovante (Opcional)</label>
                                <ImageUpload
                                    folder="receipts"
                                    currentImage={editReceiptUrl}
                                    onImageChange={setEditReceiptUrl}
                                    placeholder="Alterar Comprovante"
                                    className="h-32"
                                    noCrop={true}
                                />
                            </div>

                            <LoadingButton
                                onClick={handleSaveEditExpense}
                                isLoading={isSubmitting}
                                loadingText="Salvando..."
                                className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30"
                            >
                                Salvar Alterações
                            </LoadingButton>

                            <button
                                onClick={() => {
                                    setExpenseToDelete(editingExpense.id);
                                    setEditingExpense(null);
                                }}
                                className="w-full py-3 text-red-500 font-bold text-xs"
                            >
                                Excluir Despesa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={!!expenseToDelete}
                title="Excluir Despesa?"
                message="Tem certeza que deseja remover esta despesa? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={confirmDeleteExpense}
                onCancel={() => setExpenseToDelete(null)}
                type="danger"
                isLoading={isSubmitting}
            />

            {mergingParticipant && (
                // ...existing mergingParticipant modal...
                <div className="fixed inset-0 z-[60] flex items-end justify-center max-w-[480px] mx-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMergingParticipant(null)}></div>
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl p-6 animate-slide-up">
                        <div className="w-12 h-1.5 bg-terracotta-100 rounded-full mx-auto mb-6"></div>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="material-symbols-outlined text-3xl">sync_alt</span>
                            </div>
                            <h3 className="text-xl font-bold text-sunset-dark">Mesclar Participante</h3>
                            <p className="text-sm text-sunset-muted mt-1">
                                Mover todas as despesas de <span className="font-bold text-sunset-dark">{mergingParticipant.name}</span> para:
                            </p>
                        </div>

                        <div className="space-y-2 max-h-[40vh] overflow-y-auto no-scrollbar mb-6">
                            {currentTrip?.participants
                                .filter(p => p.id !== mergingParticipant.id)
                                .map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleMergeParticipants(p.id)}
                                        className="w-full flex items-center gap-3 p-3 bg-warm-cream rounded-2xl active:scale-95 transition-all border border-transparent hover:border-terracotta-200"
                                    >
                                        <img src={p.avatar} alt="" className="w-10 h-10 rounded-full object-cover border border-white" />
                                        <div className="text-left">
                                            <p className="font-bold text-sunset-dark">{p.name}</p>
                                            <p className="text-[10px] text-sunset-muted uppercase font-bold tracking-widest">
                                                {p.isExternal ? 'Participante Externo' : 'Usuário do App'}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                        </div>

                        <button
                            onClick={() => setMergingParticipant(null)}
                            className="w-full py-4 text-sunset-muted font-bold text-sm"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Expense Detail Modal */}
            {viewingExpense && (
                <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setViewingExpense(null)}></div>
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
                        <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4 z-10 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Detalhes da Despesa</h2>
                            <button onClick={() => setViewingExpense(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600">
                                <span className="material-symbols-outlined text-xl">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Header Info */}
                            <div className="text-center">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg ${CATEGORIES.find(c => c.id === viewingExpense.category)?.color || 'bg-slate-400'}`}>
                                    <span className="material-symbols-outlined text-3xl">{CATEGORIES.find(c => c.id === viewingExpense.category)?.icon || 'payments'}</span>
                                </div>
                                <h3 className="text-2xl font-black text-sunset-dark uppercase tracking-tight">{viewingExpense.description}</h3>
                                <p className="text-3xl font-black text-terracotta-600 mt-1">R$ {viewingExpense.amount.toFixed(2)}</p>
                                <p className="text-xs font-bold text-sunset-muted uppercase tracking-widest mt-1">
                                    {new Date(viewingExpense.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                                </p>
                            </div>

                            {/* Details Grid */}
                            <div className="bg-warm-cream rounded-3xl p-5 border border-terracotta-100 space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-sunset-muted">Paga por</span>
                                    <div className="flex items-center gap-2">
                                        <img src={currentTrip?.participants.find(p => p.id === viewingExpense.paidBy)?.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                        <span className="font-black text-sunset-dark">{currentTrip?.participants.find(p => p.id === viewingExpense.paidBy)?.name}</span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-sunset-muted">Categoria</span>
                                    <span className="font-black text-sunset-dark">{viewingExpense.category}</span>
                                </div>

                                <div className="flex items-center justify-between text-sm">
                                    <span className="font-bold text-sunset-muted">Método</span>
                                    <span className="font-black text-sunset-dark">
                                        {viewingExpense.paymentMethod === 'installment' ? 'Parcelado' : 'À Vista'}
                                    </span>
                                </div>

                                {viewingExpense.paymentMethod === 'installment' && viewingExpense.installment && (
                                    <div className="pt-3 border-t border-terracotta-100 space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-sunset-muted">Parcelas</span>
                                            <span className="font-black text-amber-600">{viewingExpense.installment.paid} de {viewingExpense.installment.total} pagas</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-sunset-muted">Valor Parcela</span>
                                            <span className="font-black text-sunset-dark">R$ {viewingExpense.installment.amount.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Participants */}
                            <div>
                                <h4 className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest mb-3 px-1">Dividido com</h4>
                                <div className="flex flex-wrap gap-2">
                                    {viewingExpense.participants.map(pId => {
                                        const p = currentTrip?.participants.find(part => part.id === pId);
                                        return (
                                            <div key={pId} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-terracotta-100 rounded-full shadow-sm">
                                                <img src={p?.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                                <span className="text-xs font-bold text-sunset-dark">{p?.name.split(' ')[0]}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Receipt Preview */}
                            {viewingExpense.receiptUrl && (
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest px-1">Comprovante</h4>
                                    <div
                                        onClick={() => setShowReceiptFull(true)}
                                        className="relative group cursor-pointer overflow-hidden rounded-2xl border border-terracotta-100 shadow-inner bg-slate-100 aspect-[4/3] flex items-center justify-center"
                                    >
                                        {viewingExpense.receiptUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <span className="material-symbols-outlined text-6xl text-red-500">picture_as_pdf</span>
                                                <span className="text-xs font-bold text-sunset-muted uppercase">Clique para abrir PDF</span>
                                            </div>
                                        ) : (
                                            <>
                                                <img
                                                    src={viewingExpense.receiptUrl}
                                                    alt="Comprovante"
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                                />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="bg-white/90 px-4 py-2 rounded-xl text-xs font-bold text-sunset-dark">Ver em tela cheia</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 pb-8">
                                <button
                                    onClick={() => {
                                        handleOpenEditExpense(viewingExpense);
                                        setViewingExpense(null);
                                    }}
                                    className="flex-1 h-14 bg-white border-2 border-terracotta-500 text-terracotta-600 font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-xl">edit</span>
                                    Editar
                                </button>
                                <button
                                    onClick={() => {
                                        setExpenseToDelete(viewingExpense.id);
                                        setViewingExpense(null);
                                    }}
                                    className="flex-1 h-14 bg-red-50 text-red-600 font-bold rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-xl">delete</span>
                                    Excluir
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN RECEIPT VIEWER */}
            {showReceiptFull && viewingExpense?.receiptUrl && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center animate-fade-in">
                    <button
                        onClick={() => setShowReceiptFull(false)}
                        className="absolute top-8 right-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md active:scale-90 transition-transform"
                    >
                        <span className="material-symbols-outlined text-3xl">close</span>
                    </button>

                    <div className="w-full h-full p-4 flex items-center justify-center">
                        {viewingExpense.receiptUrl.toLowerCase().split('?')[0].endsWith('.pdf') ? (
                            <iframe
                                src={viewingExpense.receiptUrl}
                                className="w-full h-full max-w-[480px] rounded-2xl bg-white"
                                title="Receipt PDF"
                            />
                        ) : (
                            <img
                                src={viewingExpense.receiptUrl}
                                alt="Receipt Full"
                                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                            />
                        )}
                    </div>

                    <button
                        onClick={() => window.open(viewingExpense.receiptUrl, '_blank')}
                        className="absolute bottom-12 px-6 py-3 bg-white/10 text-white border border-white/20 rounded-2xl font-bold flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined">download</span>
                        Abrir Original
                    </button>
                </div>
            )}
            <BottomNav />
        </div >
    );
};

export default Finance;
