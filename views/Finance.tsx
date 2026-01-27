import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { storageService } from '../services/storageService';
import { Trip, Expense, Participant, PaymentMethod, Installment } from '../types';
import BottomNav from '../components/BottomNav';
import Sidebar from '../components/Sidebar';
import Toast, { ToastType } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
import { ExpenseList, BalanceList, SettlementList, ParticipantList } from '../components/finance';

const CATEGORIES = [
    { id: 'Todos', icon: 'grid_view', label: 'Todas' },
    { id: 'Hospedagem', icon: 'bed', label: 'Hospedagem', color: 'bg-blue-500' },
    { id: 'Transporte', icon: 'flight', label: 'Transporte', color: 'bg-amber-500' },
    { id: 'Passeios', icon: 'confirmation_number', label: 'Passeios', color: 'bg-purple-500' },
    { id: 'Alimentação', icon: 'restaurant', label: 'Restaurantes', color: 'bg-emerald-500' },
    { id: 'Outros', icon: 'shopping_bag', label: 'Outros', color: 'bg-slate-500' },
];

const Finance: React.FC = () => {
    const navigate = useNavigate();
    const { tripId } = useParams();
    const location = useLocation();
    const isAdding = location.pathname.endsWith('/add');

    // Core state
    const [trips, setTrips] = useState<Trip[]>([]);
    const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    // Trip filters
    const [showPastTrips, setShowPastTrips] = useState(false);

    // Finance tabs - NOW WITH 5 TABS
    const [activeTab, setActiveTab] = useState<'overview' | 'expenses' | 'balances' | 'settle' | 'participants'>('overview');
    const [categoryFilter, setCategoryFilter] = useState<string>('Todos');

    // Modals
    const [showAddExpense, setShowAddExpense] = useState(isAdding);
    const [showAddExternal, setShowAddExternal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);

    // Form states - Add Expense
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('Alimentação');
    const [paidBy, setPaidBy] = useState('');
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);

    // Edit Expense Modal
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [editAmount, setEditAmount] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editPaidBy, setEditPaidBy] = useState('');
    const [editParticipants, setEditParticipants] = useState<string[]>([]);
    const [editInstallmentEnabled, setEditInstallmentEnabled] = useState(false);
    const [editInstallmentTotal, setEditInstallmentTotal] = useState('2');
    const [editInstallmentPaid, setEditInstallmentPaid] = useState('0');
    const [editInstallmentFirstDate, setEditInstallmentFirstDate] = useState('');


    // Form states - Add External
    const [externalName, setExternalName] = useState('');

    // Merge state
    const [mergingParticipant, setMergingParticipant] = useState<Participant | null>(null);

    // Settings
    const [optimizeTransfers, setOptimizeTransfers] = useState(() => {
        return localStorage.getItem('triip_optimize_transfers') === 'true';
    });

    // Settled payments tracking
    const [settledPayments, setSettledPayments] = useState<string[]>(() => {
        const saved = localStorage.getItem(`triip_settled_${tripId}`);
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const loadInitialData = async () => {
            const allTrips = await storageService.getTrips();
            setTrips(allTrips);

            if (tripId) {
                const trip = await storageService.getTripById(tripId);
                setCurrentTrip(trip);
                if (trip) {
                    const tripExpenses = await storageService.getExpensesByTrip(tripId);
                    setExpenses(tripExpenses);
                    setPaidBy(trip.participants[0]?.id || '');
                    setSelectedParticipants(trip.participants.map(p => p.id));
                    const saved = localStorage.getItem(`triip_settled_${tripId}`);
                    setSettledPayments(saved ? JSON.parse(saved) : []);
                }
            }
        };
        loadInitialData();
    }, [tripId]);

    // React to isAdding from URL (for quick action menu)
    useEffect(() => {
        if (isAdding) {
            setShowAddExpense(true);
        }
    }, [isAdding]);

    // Filtered trips for selection
    const filteredTrips = useMemo(() => {
        return trips.filter(t => {
            if (showPastTrips) {
                return t.status === 'confirmed' || t.status === 'past';
            }
            return t.status === 'confirmed';
        });
    }, [trips, showPastTrips]);

    // Filtered expenses
    const filteredExpenses = useMemo(() => {
        if (categoryFilter === 'Todos') return expenses;
        return expenses.filter(e => e.category === categoryFilter);
    }, [expenses, categoryFilter]);

    // Calculate balances
    const calculateBalances = () => {
        if (!currentTrip) return [];

        const balances: Record<string, number> = {};
        currentTrip.participants.forEach(p => balances[p.id] = 0);

        expenses.forEach(exp => {
            // ✅ Proteção contra divisão por zero: se não houver participantes, assume que quem pagou assume tudo
            const participantCount = exp.participants?.length || 1;
            const share = exp.amount / participantCount;

            balances[exp.paidBy] = (balances[exp.paidBy] || 0) + exp.amount;

            (exp.participants || []).forEach(pId => {
                balances[pId] = (balances[pId] || 0) - share;
            });
        });

        return currentTrip.participants.map(p => ({
            ...p,
            balance: balances[p.id] || 0
        })).sort((a, b) => b.balance - a.balance);
    };

    // Calculate settlements (who owes who)
    const calculateSettlements = () => {
        if (!currentTrip) return [];

        const balances = calculateBalances();
        const debtors = balances.filter(b => b.balance < -0.01).map(b => ({ ...b, balance: -b.balance }));
        const creditors = balances.filter(b => b.balance > 0.01);

        const settlements: Array<{ from: Participant & { balance: number }; to: Participant & { balance: number }; amount: number; id: string }> = [];

        if (optimizeTransfers) {
            let d = 0, c = 0;
            const debtorsCopy = debtors.map(d => ({ ...d }));
            const creditorsCopy = creditors.map(c => ({ ...c }));

            while (d < debtorsCopy.length && c < creditorsCopy.length) {
                const debtor = debtorsCopy[d];
                const creditor = creditorsCopy[c];
                const amount = Math.min(debtor.balance, creditor.balance);

                if (amount > 0.01) {
                    settlements.push({
                        from: debtor,
                        to: creditor,
                        amount,
                        id: `${debtor.id}-${creditor.id}`
                    });
                }

                debtor.balance -= amount;
                creditor.balance -= amount;

                if (debtor.balance < 0.01) d++;
                if (creditor.balance < 0.01) c++;
            }
        } else {
            debtors.forEach(debtor => {
                creditors.forEach(creditor => {
                    const totalDebt = debtors.reduce((sum, d) => sum + d.balance, 0);
                    if (totalDebt > 0) {
                        const proportion = debtor.balance / totalDebt;
                        const amount = creditor.balance * proportion;

                        if (amount > 0.01) {
                            settlements.push({
                                from: debtor,
                                to: creditor,
                                amount,
                                id: `${debtor.id}-${creditor.id}`
                            });
                        }
                    }
                });
            });
        }

        return settlements.filter(s => !settledPayments.includes(s.id));
    };

    // Total stats
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const balances = calculateBalances();
    const settlements = calculateSettlements();
    const pendingCount = settlements.length;
    const financeMode = currentTrip?.financeMode || 'split';
    const isTrackMode = financeMode === 'track';

    // Installment stats
    const installmentExpenses = expenses.filter(e => e.paymentMethod === 'installment' && e.installment);
    const pendingInstallments = installmentExpenses.reduce((sum, e) => {
        if (e.installment) return sum + (e.installment.total - e.installment.paid);
        return sum;
    }, 0);

    // Handlers
    const handleAddExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tripId || !amount || !description || !paidBy || selectedParticipants.length === 0) {
            setToast({ message: 'Preencha todos os campos', type: 'error' });
            return;
        }

        const newExpense: Omit<Expense, 'id'> = {
            tripId,
            amount: parseFloat(amount),
            description,
            category: category as any,
            paidBy,
            participants: selectedParticipants,
            status: 'pending',
            date: new Date().toISOString(),
            paymentMethod: editInstallmentEnabled ? 'installment' : 'cash',
            installment: editInstallmentEnabled ? {
                total: parseInt(editInstallmentTotal) || 2,
                paid: 0,
                firstDueDate: editInstallmentFirstDate || new Date().toISOString().split('T')[0],
                amount: parseFloat(amount) / (parseInt(editInstallmentTotal) || 2)
            } : undefined,
        };

        const created = await storageService.createExpense(newExpense);
        if (created) {
            setToast({ message: 'Despesa adicionada!', type: 'success' });
            setShowAddExpense(false);
            const updatedExpenses = await storageService.getExpensesByTrip(tripId);
            setExpenses(updatedExpenses);
            setAmount('');
            setDescription('');
        }
    };

    const handleDeleteExpense = (expenseId: string) => {
        setExpenseToDelete(expenseId);
    };

    const confirmDeleteExpense = async () => {
        if (!expenseToDelete || !tripId) return;
        const success = await storageService.deleteExpense(expenseToDelete);
        if (success) {
            const updatedExpenses = await storageService.getExpensesByTrip(tripId);
            setExpenses(updatedExpenses);
            setToast({ message: 'Despesa removida', type: 'info' });
        }
        setExpenseToDelete(null);
    };

    const handleAddExternalParticipant = async () => {
        if (!currentTrip || !externalName.trim()) return;

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
    };

    const handleRemoveParticipant = async (participantId: string) => {
        if (!currentTrip) return;

        // Check if participant has expenses
        const hasExpenses = expenses.some(e => e.paidBy === participantId || e.participants.includes(participantId));
        if (hasExpenses) {
            setToast({ message: 'Não é possível remover participante com despesas', type: 'error' });
            return;
        }

        const success = await storageService.removeParticipantFromTrip(participantId);
        if (success) {
            const updatedTrip = await storageService.getTripById(currentTrip.id);
            setCurrentTrip(updatedTrip);
            setToast({ message: 'Participante removido', type: 'info' });
        }
    };

    const handleSettlePayment = (settlementId: string) => {
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
    };

    const handleSaveEditExpense = async () => {
        if (!editingExpense || !tripId) return;

        const updates: Partial<Expense> = {
            amount: parseFloat(editAmount),
            description: editDescription,
            category: editCategory as any,
            paidBy: editPaidBy,
            participants: editParticipants,
            paymentMethod: editInstallmentEnabled ? 'installment' : 'cash',
            installment: editInstallmentEnabled ? {
                total: parseInt(editInstallmentTotal) || 2,
                paid: parseInt(editInstallmentPaid) || 0,
                firstDueDate: editInstallmentFirstDate || new Date().toISOString().split('T')[0],
                amount: parseFloat(editAmount) / (parseInt(editInstallmentTotal) || 2)
            } : undefined,
        };

        const updated = await storageService.updateExpense(editingExpense.id, updates);
        if (updated) {
            const updatedExpenses = await storageService.getExpensesByTrip(tripId);
            setExpenses(updatedExpenses);
            setEditingExpense(null);
            setToast({ message: 'Despesa atualizada!', type: 'success' });
        }
    };

    const handlePayInstallment = async (expense: Expense) => {
        if (!expense.installment || !tripId) return;

        const newPaid = Math.min(expense.installment.paid + 1, expense.installment.total);
        const updated = await storageService.updateExpense(expense.id, {
            installment: { ...expense.installment, paid: newPaid }
        });
        if (updated) {
            const updatedExpenses = await storageService.getExpensesByTrip(tripId);
            setExpenses(updatedExpenses);
            setToast({ message: `Parcela ${newPaid}/${expense.installment.total} marcada como paga!`, type: 'success' });
        }
    };

    const handleMergeParticipants = async (targetId: string) => {
        if (!mergingParticipant || !tripId) return;

        const success = await storageService.mergeParticipants(mergingParticipant.id, targetId);
        if (success) {
            const updatedTrip = await storageService.getTripById(tripId);
            const updatedExpenses = await storageService.getExpensesByTrip(tripId);
            setCurrentTrip(updatedTrip);
            setExpenses(updatedExpenses);
            setMergingParticipant(null);
            setToast({ message: 'Participantes mesclados com sucesso! 🤝', type: 'success' });
        } else {
            setToast({ message: 'Erro ao mesclar participantes', type: 'error' });
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

                {/* Summary Cards - ONLY visible when NOT in overview to avoid duplication */}
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

                {/* Mode Badge - Simplified when in overview */}
                <div className={`mb-4 px-3 py-2 rounded-xl flex items-center gap-2 ${isTrackMode ? 'bg-blue-50 border border-blue-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                    <span className={`material-symbols-outlined text-lg ${isTrackMode ? 'text-blue-600' : 'text-emerald-600'}`}>
                        {isTrackMode ? 'account_balance_wallet' : 'payments'}
                    </span>
                    <p className={`text-[10px] font-bold ${isTrackMode ? 'text-blue-700' : 'text-emerald-700'}`}>
                        {isTrackMode ? 'Modo Controle: Pessoal' : 'Modo Divisão: Grupo'}
                    </p>
                </div>

                {/* Tabs - Adapted for Track/Split */}
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

                        {/* Top Spender (Quick Glance) */}
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
                        {/* Category Filter - Grid Layout (No Scroll) */}
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

                        {/* Expense List Component */}
                        <ExpenseList
                            expenses={filteredExpenses}
                            participants={currentTrip?.participants || []}
                            categories={CATEGORIES}
                            isTrackMode={isTrackMode}
                            onEdit={handleOpenEditExpense}
                            onDelete={handleDeleteExpense}
                            onAddClick={() => setShowAddExpense(true)}
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
                    />
                )}
            </main>

            {/* Add Expense Modal */}
            {
                showAddExpense && (
                    <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddExpense(false)}></div>
                        <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-terracotta-100 px-6 py-4">
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
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Valor</label>
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
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Descrição</label>
                                    <input
                                        type="text"
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Ex: Almoço no restaurante"
                                        className="w-full h-12 px-4 bg-warm-cream border border-terracotta-100 rounded-2xl text-sm font-medium text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                    />
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Categoria</label>
                                    <div className="grid grid-cols-5 gap-2">
                                        {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => (
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

                                {/* Paid By */}
                                <div>
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Quem pagou?</label>
                                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                        {currentTrip?.participants.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => setPaidBy(p.id)}
                                                className={`flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${paidBy === p.id ? 'bg-terracotta-500 text-white' : 'bg-terracotta-50 text-sunset-dark'
                                                    }`}
                                            >
                                                <img src={p.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                <span className="text-xs font-bold">{p.name.split(' ')[0]}</span>
                                                {p.isExternal && <span className="text-[8px]">📍</span>}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Split Between */}
                                <div>
                                    <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Dividir entre</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {/* Todos Button */}
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
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${currentTrip && selectedParticipants.length === currentTrip.participants.length
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-terracotta-50 text-sunset-dark'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-sm">group</span>
                                            <span className="text-xs font-bold">Todos</span>
                                        </button>
                                        {currentTrip?.participants.map(p => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    if (selectedParticipants.includes(p.id)) {
                                                        setSelectedParticipants(selectedParticipants.filter(id => id !== p.id));
                                                    } else {
                                                        setSelectedParticipants([...selectedParticipants, p.id]);
                                                    }
                                                }}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${selectedParticipants.includes(p.id) ? 'bg-emerald-500 text-white' : 'bg-terracotta-50 text-sunset-dark'
                                                    }`}
                                            >
                                                <img src={p.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                                <span className="text-xs font-bold">{p.name.split(' ')[0]}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Installment Section - Add Expense */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-terracotta-100"></div>
                                    <span className="text-[10px] font-bold text-sunset-muted uppercase">Parcelamento</span>
                                    <div className="flex-1 h-px bg-terracotta-100"></div>
                                </div>

                                <div className={`rounded-2xl border transition-all ${editInstallmentEnabled ? 'bg-amber-50 border-amber-200' : 'bg-terracotta-50 border-terracotta-100'}`}>
                                    <div className="p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editInstallmentEnabled ? 'bg-amber-500 text-white' : 'bg-terracotta-200 text-sunset-muted'}`}>
                                                    <span className="material-symbols-outlined text-xl">credit_card</span>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sunset-dark text-sm">Parcelar Gasto</p>
                                                    <p className="text-[10px] text-sunset-muted">Dividir em parcelas mensais</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditInstallmentEnabled(!editInstallmentEnabled)}
                                                className={`w-12 h-6 rounded-full transition-all relative ${editInstallmentEnabled ? 'bg-amber-500' : 'bg-terracotta-200'}`}
                                            >
                                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform ${editInstallmentEnabled ? 'left-6.5' : 'left-0.5'}`}></div>
                                            </button>
                                        </div>

                                        {editInstallmentEnabled && (
                                            <div className="space-y-3 animate-fade-in mt-3">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-1 block">Parcelas</label>
                                                        <select
                                                            value={editInstallmentTotal}
                                                            onChange={(e) => setEditInstallmentTotal(e.target.value)}
                                                            className="w-full h-10 px-3 bg-white border border-amber-200 rounded-xl text-xs font-bold text-sunset-dark focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                        >
                                                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                                <option key={n} value={n}>{n}x</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] font-bold text-amber-700 uppercase tracking-wider mb-1 block">1º Vencimento</label>
                                                        <input
                                                            type="date"
                                                            value={editInstallmentFirstDate}
                                                            onChange={(e) => setEditInstallmentFirstDate(e.target.value)}
                                                            className="w-full h-10 px-3 bg-white border border-amber-200 rounded-xl text-xs font-bold text-sunset-dark focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                        />
                                                    </div>
                                                </div>
                                                {amount && (
                                                    <div className="bg-white rounded-xl py-2 px-3 text-center border border-amber-100">
                                                        <p className="text-amber-700 text-[10px] font-bold">
                                                            💳 {editInstallmentTotal}x de R$ {(parseFloat(amount) / parseInt(editInstallmentTotal)).toFixed(2)}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined">add</span>
                                    Adicionar Despesa
                                </button>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Add External Modal */}
            {
                showAddExternal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddExternal(false)}></div>
                        <div className="relative w-full bg-white rounded-3xl shadow-2xl p-6">
                            <h2 className="text-xl font-bold mb-4">Adicionar Pessoa Externa</h2>
                            <p className="text-sm text-sunset-muted mb-4">
                                Adicione alguém que não tem o app para incluir nas despesas.
                            </p>
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
                                <button
                                    onClick={handleAddExternalParticipant}
                                    disabled={!externalName.trim()}
                                    className="flex-1 h-12 bg-terracotta-500 text-white font-bold rounded-2xl disabled:opacity-50"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Settings Modal */}
            {
                showSettings && (
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
                                {/* Optimize Toggle */}
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

                                {/* Explanation */}
                                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
                                    <p className="text-xs text-blue-800">
                                        <strong>Como funciona?</strong><br />
                                        Com a otimização, se A deve R$50 para B e B deve R$30 para C, o sistema sugere: A paga R$20 para B e R$30 para C diretamente.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            {/* Edit Expense Modal - Complete Version */}
            {editingExpense && (
                <div className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditingExpense(null)}></div>
                    <div className="relative w-full bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="sticky top-0 z-10 bg-white border-b border-terracotta-100 px-6 py-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-sunset-dark">Editar Despesa</h2>
                                    <p className="text-[10px] text-sunset-muted">Ajuste os detalhes da despesa</p>
                                </div>
                                <button onClick={() => setEditingExpense(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-terracotta-50 text-terracotta-600 active:scale-95 transition-transform">
                                    <span className="material-symbols-outlined text-xl">close</span>
                                </button>
                            </div>
                        </div>

                        <div className="px-6 py-5 space-y-5">
                            {/* Amount - Hero Input */}
                            <div className="bg-gradient-to-br from-terracotta-500 to-terracotta-600 rounded-3xl p-6 text-center shadow-lg shadow-terracotta-500/30">
                                <p className="text-terracotta-100 text-xs font-bold uppercase tracking-wider mb-2">Valor Total</p>
                                <div className="flex items-center justify-center gap-1">
                                    <span className="text-white/70 text-2xl font-bold">R$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={editAmount}
                                        onChange={e => setEditAmount(e.target.value)}
                                        className="bg-transparent text-white text-5xl font-black text-center w-40 focus:outline-none placeholder:text-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        placeholder="0,00"
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
                                    className="w-full h-14 px-5 bg-warm-cream border border-terracotta-100 rounded-2xl text-lg font-bold text-sunset-dark focus:outline-none focus:ring-2 focus:ring-terracotta-500"
                                    placeholder="O que foi comprado?"
                                />
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Categoria</label>
                                <div className="grid grid-cols-5 gap-2">
                                    {CATEGORIES.filter(c => c.id !== 'Todos').map(cat => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setEditCategory(cat.id)}
                                            className={`flex flex-col items-center justify-center py-3 rounded-2xl transition-all ${editCategory === cat.id
                                                ? `${cat.color} text-white shadow-lg shadow-${cat.color}/30`
                                                : 'bg-warm-cream text-sunset-muted border border-terracotta-100'
                                                }`}
                                        >
                                            <span className="material-symbols-outlined text-xl mb-1">{cat.icon}</span>
                                            <span className="text-[8px] font-bold">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Paid By */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Quem pagou?</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                    {currentTrip?.participants.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => setEditPaidBy(p.id)}
                                            className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl transition-all ${editPaidBy === p.id ? 'bg-terracotta-500 text-white shadow-lg shadow-terracotta-500/30' : 'bg-warm-cream text-sunset-dark border border-terracotta-100'}`}
                                        >
                                            <img src={p.avatar} alt="" className="w-8 h-8 rounded-full object-cover border-2 border-white/50" />
                                            <span className="text-sm font-bold">{p.name.split(' ')[0]}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Split Between */}
                            <div>
                                <label className="text-xs font-bold text-sunset-muted uppercase tracking-wider mb-2 block">Dividir entre</label>
                                <div className="flex flex-wrap gap-2">
                                    {/* Select All Button */}
                                    <button
                                        onClick={() => {
                                            const allIds = currentTrip?.participants.map(p => p.id) || [];
                                            if (editParticipants.length === allIds.length) {
                                                setEditParticipants([]);
                                            } else {
                                                setEditParticipants(allIds);
                                            }
                                        }}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-bold ${editParticipants.length === currentTrip?.participants.length ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-terracotta-100 text-sunset-dark border border-terracotta-200'}`}
                                    >
                                        <span className="material-symbols-outlined text-lg">group</span>
                                        <span className="text-xs">Todos</span>
                                        {editParticipants.length === currentTrip?.participants.length && (
                                            <span className="material-symbols-outlined text-sm">check</span>
                                        )}
                                    </button>
                                    {currentTrip?.participants.map(p => (
                                        <button
                                            key={p.id}
                                            onClick={() => {
                                                if (editParticipants.includes(p.id)) {
                                                    setEditParticipants(editParticipants.filter(id => id !== p.id));
                                                } else {
                                                    setEditParticipants([...editParticipants, p.id]);
                                                }
                                            }}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${editParticipants.includes(p.id) ? 'bg-emerald-500 text-white' : 'bg-terracotta-50 text-sunset-dark border border-terracotta-100'}`}
                                        >
                                            <img src={p.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                                            <span className="text-xs font-bold">{p.name.split(' ')[0]}</span>
                                            {editParticipants.includes(p.id) && (
                                                <span className="material-symbols-outlined text-sm">check</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                {editParticipants.length > 0 && editAmount && (
                                    <p className="text-xs text-sunset-muted mt-2 text-center">
                                        R$ {(parseFloat(editAmount) / editParticipants.length).toFixed(2)} por pessoa
                                    </p>
                                )}
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-terracotta-100"></div>
                                <span className="text-[10px] font-bold text-sunset-muted uppercase">Parcelamento</span>
                                <div className="flex-1 h-px bg-terracotta-100"></div>
                            </div>

                            {/* Installment Section - Premium Design */}
                            <div className={`rounded-3xl border-2 transition-all ${editInstallmentEnabled ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300' : 'bg-terracotta-50 border-terracotta-100'}`}>
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${editInstallmentEnabled ? 'bg-amber-500 text-white' : 'bg-terracotta-200 text-sunset-muted'}`}>
                                                <span className="material-symbols-outlined text-2xl">credit_card</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-sunset-dark">Receber Parcelado</p>
                                                <p className="text-[10px] text-sunset-muted">Divida o pagamento em parcelas</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setEditInstallmentEnabled(!editInstallmentEnabled)}
                                            className={`w-14 h-8 rounded-full transition-all relative ${editInstallmentEnabled ? 'bg-amber-500' : 'bg-terracotta-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${editInstallmentEnabled ? 'left-7' : 'left-1'}`}></div>
                                        </button>
                                    </div>

                                    {editInstallmentEnabled && (
                                        <div className="space-y-4 animate-fade-in">
                                            {/* Config Row */}
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1 block">Parcelas</label>
                                                    <select
                                                        value={editInstallmentTotal}
                                                        onChange={(e) => setEditInstallmentTotal(e.target.value)}
                                                        className="w-full h-12 px-4 bg-white border border-amber-200 rounded-xl text-sm font-bold text-sunset-dark focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                    >
                                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                                                            <option key={n} value={n}>{n}x</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-1 block">1º Vencimento</label>
                                                    <input
                                                        type="date"
                                                        value={editInstallmentFirstDate}
                                                        onChange={(e) => setEditInstallmentFirstDate(e.target.value)}
                                                        className="w-full h-12 px-4 bg-white border border-amber-200 rounded-xl text-sm font-bold text-sunset-dark focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                    />
                                                </div>
                                            </div>

                                            {/* Value Preview */}
                                            <div className="bg-white rounded-2xl p-4 text-center border border-amber-200">
                                                <p className="text-amber-700 text-sm font-bold">
                                                    💳 {editInstallmentTotal}x de R$ {editAmount ? (parseFloat(editAmount) / parseInt(editInstallmentTotal)).toFixed(2) : '0,00'}
                                                </p>
                                            </div>

                                            {/* Debtors Section - Who Owes */}
                                            {editParticipants.filter(pid => pid !== editPaidBy).length > 0 && (
                                                <div className="bg-white rounded-2xl p-4 border border-amber-200 space-y-3">
                                                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Quem está devendo</p>

                                                    {editParticipants.filter(pid => pid !== editPaidBy).map(debtorId => {
                                                        const debtor = currentTrip?.participants.find(p => p.id === debtorId);
                                                        const perPersonTotal = editAmount ? parseFloat(editAmount) / editParticipants.length : 0;
                                                        const installmentAmount = perPersonTotal / parseInt(editInstallmentTotal);
                                                        const paidCount = parseInt(editInstallmentPaid) || 0;

                                                        return (
                                                            <div key={debtorId} className="bg-amber-50 rounded-xl p-3">
                                                                <div className="flex items-center gap-3 mb-2">
                                                                    <img src={debtor?.avatar || ''} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-amber-300" />
                                                                    <div className="flex-1">
                                                                        <p className="font-bold text-sunset-dark text-sm">{debtor?.name}</p>
                                                                        <p className="text-[10px] text-sunset-muted">
                                                                            Deve R$ {perPersonTotal.toFixed(2)} total
                                                                        </p>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-lg font-black text-amber-600">{paidCount}/{editInstallmentTotal}</p>
                                                                        <p className="text-[9px] text-sunset-muted">pagas</p>
                                                                    </div>
                                                                </div>
                                                                {/* Progress Bar */}
                                                                <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                                                                    <div
                                                                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all"
                                                                        style={{ width: `${(paidCount / parseInt(editInstallmentTotal)) * 100}%` }}
                                                                    ></div>
                                                                </div>
                                                                {/* Installment Detail */}
                                                                <p className="text-[9px] text-amber-700 mt-2">
                                                                    {parseInt(editInstallmentTotal) - paidCount} parcelas restantes • R$ {installmentAmount.toFixed(2)}/parcela
                                                                </p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {/* Payment Control */}
                                            <div className="bg-white rounded-2xl p-4 border border-amber-200">
                                                <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-2 block">Marcar Parcelas Pagas</label>
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => setEditInstallmentPaid(String(Math.max(0, parseInt(editInstallmentPaid) - 1)))}
                                                        className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700 font-bold text-xl active:scale-95 transition-transform"
                                                    >
                                                        -
                                                    </button>
                                                    <div className="flex-1 h-12 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center gap-1">
                                                        <span className="text-2xl font-black text-amber-600">{editInstallmentPaid}</span>
                                                        <span className="text-amber-400 mx-1">/</span>
                                                        <span className="text-lg font-bold text-sunset-dark">{editInstallmentTotal}</span>
                                                    </div>
                                                    <button
                                                        onClick={() => setEditInstallmentPaid(String(Math.min(parseInt(editInstallmentTotal), parseInt(editInstallmentPaid) + 1)))}
                                                        className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-xl active:scale-95 transition-transform shadow-lg shadow-amber-500/30"
                                                    >
                                                        +
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Save Button */}
                            <button
                                onClick={handleSaveEditExpense}
                                className="w-full h-16 bg-gradient-to-r from-terracotta-500 to-terracotta-600 text-white font-bold rounded-2xl shadow-xl shadow-terracotta-500/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all"
                            >
                                <span className="material-symbols-outlined text-2xl">save</span>
                                <span className="text-lg">Salvar Alterações</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Expense Delete Confirmation */}
            <ConfirmModal
                isOpen={!!expenseToDelete}
                title="Excluir Despesa?"
                message="Tem certeza que deseja remover esta despesa? Esta ação não pode ser desfeita."
                confirmText="Excluir"
                cancelText="Cancelar"
                onConfirm={confirmDeleteExpense}
                onCancel={() => setExpenseToDelete(null)}
                type="danger"
            />

            {mergingParticipant && (
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

            <BottomNav />
        </div >
    );
};

export default Finance;
