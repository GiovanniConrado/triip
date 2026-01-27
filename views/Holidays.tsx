import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import BottomNav from '../components/BottomNav';
import { storageService } from '../services/storageService';
import { DEFAULT_TRIP_IMAGE } from '../constants';

interface Holiday {
    date: string;
    name: string;
    type: 'Nacional' | 'Estadual';
    state?: string;
    longWeekend?: boolean;
    icon?: string;
}

interface VacationPeriod {
    id: string;
    startDate: string;
    endDate: string;
    label: string;
}

const STATES = [
    { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espírito Santo' }, { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' }, { uf: 'MT', name: 'Mato Grosso' }, { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' }, { uf: 'PA', name: 'Pará' }, { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' }, { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' }, { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' }, { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' }, { uf: 'SE', name: 'Sergipe' }, { uf: 'TO', name: 'Tocantins' },
];

const HOLIDAYS_2026: Holiday[] = [
    // Nacionais
    { date: '2026-01-01', name: 'Confraternização Universal', type: 'Nacional', longWeekend: true, icon: 'celebration' },
    { date: '2026-02-16', name: 'Carnaval (Segunda)', type: 'Nacional', longWeekend: true, icon: 'sports_bar' },
    { date: '2026-02-17', name: 'Carnaval (Terça)', type: 'Nacional', longWeekend: true, icon: 'sports_bar' },
    { date: '2026-04-03', name: 'Sexta-feira Santa', type: 'Nacional', longWeekend: true, icon: 'church' },
    { date: '2026-04-21', name: 'Tiradentes', type: 'Nacional', longWeekend: true, icon: 'flag' },
    { date: '2026-05-01', name: 'Dia do Trabalho', type: 'Nacional', longWeekend: true, icon: 'handyman' },
    { date: '2026-06-04', name: 'Corpus Christi', type: 'Nacional', longWeekend: true, icon: 'church' },
    { date: '2026-09-07', name: 'Independência do Brasil', type: 'Nacional', longWeekend: true, icon: 'flag' },
    { date: '2026-10-12', name: 'Nossa Sra. Aparecida', type: 'Nacional', longWeekend: true, icon: 'church' },
    { date: '2026-11-02', name: 'Finados', type: 'Nacional', icon: 'local_florist' },
    { date: '2026-11-15', name: 'Proclamação da República', type: 'Nacional', icon: 'account_balance' },
    { date: '2026-11-20', name: 'Consciência Negra', type: 'Nacional', icon: 'diversity_3' },
    { date: '2026-12-25', name: 'Natal', type: 'Nacional', longWeekend: true, icon: 'park' },
    // Estaduais
    { date: '2026-01-23', name: 'Fundação do Rio de Janeiro', type: 'Estadual', state: 'RJ', icon: 'location_city' },
    { date: '2026-01-25', name: 'Aniversário de São Paulo', type: 'Estadual', state: 'SP', icon: 'location_city' },
    { date: '2026-02-02', name: 'Nossa Sra. dos Navegantes', type: 'Estadual', state: 'RS', icon: 'sailing' },
    { date: '2026-03-19', name: 'São José', type: 'Estadual', state: 'CE', icon: 'church' },
    { date: '2026-04-23', name: 'São Jorge', type: 'Estadual', state: 'RJ', icon: 'shield' },
    { date: '2026-06-24', name: 'São João', type: 'Estadual', state: 'BA', longWeekend: true, icon: 'celebration' },
    { date: '2026-06-24', name: 'São João', type: 'Estadual', state: 'PE', longWeekend: true, icon: 'celebration' },
    { date: '2026-07-02', name: 'Independência da Bahia', type: 'Estadual', state: 'BA', icon: 'flag' },
    { date: '2026-07-09', name: 'Rev. Constitucionalista', type: 'Estadual', state: 'SP', longWeekend: true, icon: 'history_edu' },
    { date: '2026-09-20', name: 'Revolução Farroupilha', type: 'Estadual', state: 'RS', longWeekend: true, icon: 'flag' },
    { date: '2026-10-24', name: 'Revolução de 1930', type: 'Estadual', state: 'RS', icon: 'history' },
];

const MONTHS = [
    { short: 'Jan', full: 'Janeiro' }, { short: 'Fev', full: 'Fevereiro' }, { short: 'Mar', full: 'Março' },
    { short: 'Abr', full: 'Abril' }, { short: 'Mai', full: 'Maio' }, { short: 'Jun', full: 'Junho' },
    { short: 'Jul', full: 'Julho' }, { short: 'Ago', full: 'Agosto' }, { short: 'Set', full: 'Setembro' },
    { short: 'Out', full: 'Outubro' }, { short: 'Nov', full: 'Novembro' }, { short: 'Dez', full: 'Dezembro' },
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const Holidays: React.FC = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'calendario' | 'lista' | 'planejamento'>('calendario');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedState, setSelectedState] = useState<string | null>(null);
    const [showStateModal, setShowStateModal] = useState(false);
    const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);
    const [vacations, setVacations] = useState<VacationPeriod[]>([]);
    const [planningStartDate, setPlanningStartDate] = useState<string | null>(null);
    const [trips, setTrips] = useState<any[]>([]);

    useEffect(() => {
        const loadTrips = async () => {
            const data = await storageService.getTrips();
            setTrips(data);
        };
        loadTrips();
    }, []);

    // Feriados: nacionais SEMPRE + estaduais se selecionado
    const displayedHolidays = useMemo(() => {
        const nationals = HOLIDAYS_2026.filter(h => h.type === 'Nacional');
        const regional = selectedState
            ? HOLIDAYS_2026.filter(h => h.state === selectedState)
            : [];
        return [...nationals, ...regional].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );
    }, [selectedState]);

    // Feriados do mês selecionado
    const monthHolidays = useMemo(() => {
        return displayedHolidays.filter(h => new Date(h.date + 'T00:00:00').getMonth() === selectedMonth);
    }, [selectedMonth, displayedHolidays]);

    // Próximo feriado
    const nextHoliday = useMemo(() => {
        const now = new Date();
        return displayedHolidays.find(h => new Date(h.date + 'T00:00:00') >= now);
    }, [displayedHolidays]);

    // Dias até próximo feriado
    const daysUntilNext = useMemo(() => {
        if (!nextHoliday) return null;
        const now = new Date();
        const target = new Date(nextHoliday.date + 'T00:00:00');
        return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }, [nextHoliday]);

    // Calendar grid
    const calendarDays = useMemo(() => {
        const year = 2026;
        const firstDay = new Date(year, selectedMonth, 1).getDay();
        const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
        const days = [];

        for (let i = 0; i < firstDay; i++) {
            days.push({ day: null, dateStr: '' });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `2026-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const holiday = displayedHolidays.find(h => h.date === dateStr);
            const dateObj = new Date(2026, selectedMonth, day);
            days.push({
                day,
                dateStr,
                holiday,
                isWeekend: dateObj.getDay() === 0 || dateObj.getDay() === 6,
            });
        }
        return days;
    }, [selectedMonth, displayedHolidays]);

    // Contagem de feriados por mês
    const holidayCountByMonth = useMemo(() => {
        return MONTHS.map((_, idx) => displayedHolidays.filter(h => new Date(h.date + 'T00:00:00').getMonth() === idx).length);
    }, [displayedHolidays]);

    // Adicionar férias
    const addVacation = (start: string, end: string) => {
        const newVacation: VacationPeriod = {
            id: Date.now().toString(),
            startDate: start,
            endDate: end,
            label: 'Minhas Férias',
        };
        setVacations([...vacations, newVacation]);
        setPlanningStartDate(null);
    };

    const handleCreateTrip = (holiday: Holiday) => {
        navigate(`/add-trip?date=${holiday.date}`);
    };

    return (
        <div className="relative min-h-screen w-full flex flex-col max-w-[480px] mx-auto bg-warm-cream pb-32">
            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

            {/* Header */}
            <header className="px-6 pt-14 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-terracotta-100 shadow-sm active:scale-90 transition-transform"
                        >
                            <span className="material-symbols-outlined text-sunset-dark">menu</span>
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-sunset-dark uppercase tracking-tight">Feriados 2026</h1>
                            <button
                                onClick={() => setShowStateModal(true)}
                                className="flex items-center gap-1 text-[10px] font-bold text-terracotta-500 uppercase tracking-widest"
                            >
                                <span className="material-symbols-outlined text-xs">location_on</span>
                                {selectedState ? `Nacional + ${STATES.find(s => s.uf === selectedState)?.name}` : 'Apenas Nacionais'}
                                <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contador de dias */}
                {nextHoliday && daysUntilNext !== null && (
                    <div className="mt-4 bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-terracotta-50 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-terracotta-500 text-2xl fill">{nextHoliday.icon || 'event'}</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold text-sunset-muted uppercase tracking-widest">Próximo feriado</p>
                            <p className="font-bold text-sunset-dark">{nextHoliday.name}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-terracotta-500">{daysUntilNext}</p>
                            <p className="text-[10px] font-bold text-sunset-muted uppercase">dias</p>
                        </div>
                    </div>
                )}
            </header>

            {/* Tabs */}
            <div className="px-6 pb-4">
                <div className="flex bg-white/50 p-1 rounded-2xl border border-terracotta-100 shadow-sm">
                    {[
                        { id: 'calendario', label: 'Calendário', icon: 'calendar_month' },
                        { id: 'lista', label: 'Lista', icon: 'format_list_bulleted' },
                        { id: 'planejamento', label: 'Planejar', icon: 'edit_calendar' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex-1 py-3 rounded-xl text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${activeTab === tab.id ? 'bg-white text-terracotta-600 shadow-sm' : 'text-sunset-muted'
                                }`}
                        >
                            <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <main className="flex-1 px-6 space-y-4">
                {/* ==================== ABA CALENDÁRIO ==================== */}
                {activeTab === 'calendario' && (
                    <div className="animate-fade-in space-y-4">
                        {/* Month Selector */}
                        <div className="grid grid-cols-6 gap-1 bg-white p-2 rounded-2xl border border-terracotta-100 shadow-sm">
                            {MONTHS.map((month, idx) => (
                                <button
                                    key={month.short}
                                    onClick={() => { setSelectedMonth(idx); setSelectedHoliday(null); }}
                                    className={`relative py-2 rounded-xl text-[10px] font-black transition-all ${selectedMonth === idx ? 'bg-terracotta-500 text-white shadow-md' : 'text-sunset-muted'
                                        }`}
                                >
                                    {month.short}
                                    {holidayCountByMonth[idx] > 0 && selectedMonth !== idx && (
                                        <span className="absolute -top-1 -right-0.5 w-4 h-4 bg-terracotta-500 text-white text-[8px] font-black rounded-full flex items-center justify-center">
                                            {holidayCountByMonth[idx]}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <button
                                    onClick={() => setSelectedMonth(m => m > 0 ? m - 1 : 11)}
                                    className="w-8 h-8 rounded-full bg-terracotta-50 flex items-center justify-center active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-terracotta-500">chevron_left</span>
                                </button>
                                <h2 className="text-lg font-black text-sunset-dark">{MONTHS[selectedMonth].full}</h2>
                                <button
                                    onClick={() => setSelectedMonth(m => m < 11 ? m + 1 : 0)}
                                    className="w-8 h-8 rounded-full bg-terracotta-50 flex items-center justify-center active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-terracotta-500">chevron_right</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-7 mb-2">
                                {WEEKDAYS.map((d, i) => (
                                    <div key={i} className="text-center text-[10px] font-black text-terracotta-300 uppercase">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, i) => (
                                    <button
                                        key={i}
                                        disabled={!day.day}
                                        onClick={() => day.holiday && setSelectedHoliday(day.holiday)}
                                        className={`aspect-square rounded-xl flex items-center justify-center text-xs font-bold transition-all relative ${!day.day ? 'invisible' :
                                            selectedHoliday?.date === day.dateStr ? 'bg-terracotta-500 text-white shadow-lg scale-105 z-10' :
                                                day.holiday ? 'bg-terracotta-50 text-terracotta-600 border border-terracotta-200' :
                                                    day.isWeekend ? 'text-terracotta-300' : 'text-sunset-dark'
                                            }`}
                                    >
                                        {day.day}
                                        {day.holiday && selectedHoliday?.date !== day.dateStr && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-terracotta-500 rounded-full border-2 border-white"></span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Selected Holiday Detail */}
                        {selectedHoliday && (
                            <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm animate-fade-in">
                                <div className="flex items-start gap-4">
                                    <div className="w-14 h-14 bg-terracotta-50 rounded-2xl flex items-center justify-center">
                                        <span className="material-symbols-outlined text-terracotta-500 text-3xl fill">{selectedHoliday.icon || 'event'}</span>
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-black text-lg text-sunset-dark">{selectedHoliday.name}</h3>
                                        <p className="text-xs text-sunset-muted">
                                            {new Date(selectedHoliday.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                        </p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-terracotta-100 text-terracotta-600 uppercase">
                                                {selectedHoliday.type}
                                            </span>
                                            {selectedHoliday.longWeekend && (
                                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-terracotta-50 text-terracotta-500 uppercase">
                                                    Feriadão
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleCreateTrip(selectedHoliday)}
                                    className="w-full h-12 mt-4 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                >
                                    <span className="material-symbols-outlined">flight_takeoff</span>
                                    Criar Viagem nessa Data
                                </button>
                            </div>
                        )}

                        {/* Month Holidays List */}
                        {monthHolidays.length > 0 && !selectedHoliday && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-sunset-muted uppercase tracking-widest px-1">
                                    Feriados em {MONTHS[selectedMonth].full}
                                </h3>
                                {monthHolidays.map((h, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setSelectedHoliday(h)}
                                        className="w-full bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-all"
                                    >
                                        <div className="w-10 h-10 bg-terracotta-50 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-terracotta-500 fill">{h.icon || 'event'}</span>
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-bold text-sunset-dark">{h.name}</p>
                                            <p className="text-[10px] text-sunset-muted">
                                                {new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
                                                {h.type === 'Estadual' && h.state && ` • ${h.state}`}
                                            </p>
                                        </div>
                                        {h.longWeekend && (
                                            <span className="material-symbols-outlined text-terracotta-400 text-sm">beach_access</span>
                                        )}
                                        <span className="material-symbols-outlined text-terracotta-300">chevron_right</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ==================== ABA LISTA ==================== */}
                {activeTab === 'lista' && (
                    <div className="animate-fade-in space-y-6 pb-10">
                        {MONTHS.map((month, mIdx) => {
                            const holidays = displayedHolidays.filter(h => new Date(h.date + 'T00:00:00').getMonth() === mIdx);
                            if (holidays.length === 0) return null;
                            return (
                                <div key={month.full} className="space-y-2">
                                    <h3 className="text-[10px] font-black text-terracotta-400 uppercase tracking-widest px-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-xs">event</span>
                                        {month.full}
                                        <span className="bg-terracotta-100 text-terracotta-600 text-[8px] px-1.5 py-0.5 rounded-full">{holidays.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {holidays.map((h, i) => (
                                            <div key={i} className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-4">
                                                <div className="w-12 h-12 bg-warm-cream rounded-2xl flex flex-col items-center justify-center border border-terracotta-50">
                                                    <span className="text-sm font-black text-sunset-dark">{new Date(h.date + 'T00:00:00').getDate()}</span>
                                                    <span className="text-[8px] font-bold text-sunset-muted uppercase">{month.short}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-sunset-dark truncate">{h.name}</p>
                                                    <p className="text-[10px] text-sunset-muted">
                                                        {new Date(h.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                                                        <span className="mx-1">•</span>
                                                        {h.type}{h.state && ` (${h.state})`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {h.longWeekend && (
                                                        <span className="material-symbols-outlined text-terracotta-400 fill text-lg">bed</span>
                                                    )}
                                                    <button
                                                        onClick={() => handleCreateTrip(h)}
                                                        className="w-9 h-9 rounded-full bg-terracotta-500 text-white flex items-center justify-center active:scale-95 shadow-md"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">add</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ==================== ABA PLANEJAMENTO ==================== */}
                {activeTab === 'planejamento' && (
                    <div className="animate-fade-in space-y-4">
                        {/* Month Selector */}
                        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-terracotta-100 shadow-sm">
                            <button
                                onClick={() => setSelectedMonth(m => m > 0 ? m - 1 : 11)}
                                className="w-10 h-10 rounded-full bg-terracotta-50 flex items-center justify-center active:scale-95"
                            >
                                <span className="material-symbols-outlined text-terracotta-500">chevron_left</span>
                            </button>
                            <div className="text-center">
                                <h2 className="text-lg font-black text-sunset-dark">{MONTHS[selectedMonth].full}</h2>
                                <p className="text-[10px] text-sunset-muted">2026</p>
                            </div>
                            <button
                                onClick={() => setSelectedMonth(m => m < 11 ? m + 1 : 0)}
                                className="w-10 h-10 rounded-full bg-terracotta-50 flex items-center justify-center active:scale-95"
                            >
                                <span className="material-symbols-outlined text-terracotta-500">chevron_right</span>
                            </button>
                        </div>

                        <div className="bg-white rounded-3xl p-5 border border-terracotta-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="material-symbols-outlined text-terracotta-500">edit_calendar</span>
                                    <div>
                                        <h2 className="font-black text-sunset-dark">Marcar Período</h2>
                                        <p className="text-[10px] text-sunset-muted">Toque para selecionar início e fim</p>
                                    </div>
                                </div>
                                {planningStartDate && (
                                    <button
                                        onClick={() => setPlanningStartDate(null)}
                                        className="text-[10px] font-bold text-terracotta-500 bg-terracotta-50 px-3 py-1 rounded-full"
                                    >
                                        Cancelar
                                    </button>
                                )}
                            </div>

                            {/* Mini Calendar for Planning */}
                            <div className="grid grid-cols-7 gap-1 mb-4">
                                {WEEKDAYS.map((d, i) => (
                                    <div key={i} className="text-center text-[9px] font-black text-terracotta-300 uppercase">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map((day, i) => {
                                    const isInVacation = vacations.some(v => {
                                        if (!day.dateStr) return false;
                                        return day.dateStr >= v.startDate && day.dateStr <= v.endDate;
                                    });
                                    const isStart = planningStartDate === day.dateStr;

                                    return (
                                        <button
                                            key={i}
                                            disabled={!day.day}
                                            onClick={() => {
                                                if (!day.dateStr) return;
                                                if (!planningStartDate) {
                                                    setPlanningStartDate(day.dateStr);
                                                } else {
                                                    const start = planningStartDate < day.dateStr ? planningStartDate : day.dateStr;
                                                    const end = planningStartDate < day.dateStr ? day.dateStr : planningStartDate;
                                                    addVacation(start, end);
                                                }
                                            }}
                                            className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${!day.day ? 'invisible' :
                                                isStart ? 'bg-terracotta-500 text-white' :
                                                    isInVacation ? 'bg-terracotta-100 text-terracotta-600' :
                                                        day.holiday ? 'bg-terracotta-50 text-terracotta-500 border border-terracotta-200' :
                                                            'text-sunset-dark hover:bg-terracotta-50'
                                                }`}
                                        >
                                            {day.day}
                                        </button>
                                    );
                                })}
                            </div>

                            {planningStartDate && (
                                <div className="mt-4 p-3 bg-terracotta-50 rounded-xl text-center">
                                    <p className="text-xs text-terracotta-600 font-bold">
                                        Início: {new Date(planningStartDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                    </p>
                                    <p className="text-[10px] text-terracotta-500">Agora selecione a data final</p>
                                </div>
                            )}
                        </div>

                        {/* Vacation Periods List */}
                        {vacations.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="text-[10px] font-black text-sunset-muted uppercase tracking-widest px-1">Meus Períodos</h3>
                                {vacations.map(v => (
                                    <div key={v.id} className="bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-4">
                                        <div className="w-10 h-10 bg-terracotta-50 rounded-xl flex items-center justify-center">
                                            <span className="material-symbols-outlined text-terracotta-500">beach_access</span>
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sunset-dark">{v.label}</p>
                                            <p className="text-[10px] text-sunset-muted">
                                                {new Date(v.startDate + 'T00:00:00').toLocaleDateString('pt-BR')} - {new Date(v.endDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setVacations(vacations.filter(x => x.id !== v.id))}
                                            className="w-8 h-8 rounded-full bg-terracotta-50 flex items-center justify-center text-terracotta-500 active:scale-95"
                                        >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Trips List */}
                        {(() => {
                            const confirmedTrips = trips.filter(t => t.status === 'confirmed');
                            const draftTrips = trips.filter(t => t.status === 'draft');
                            const pastTrips = trips.filter(t => t.status === 'past');
                            if (trips.length === 0) return null;
                            return (
                                <div className="space-y-4">
                                    {confirmedTrips.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-black text-sunset-muted uppercase tracking-widest px-1 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-xs text-emerald-500">check_circle</span>
                                                Viagens Confirmadas
                                            </h3>
                                            {confirmedTrips.map(trip => (
                                                <button key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="w-full bg-white rounded-2xl p-4 border border-terracotta-100 shadow-sm flex items-center gap-4 active:scale-[0.99] transition-all">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden">
                                                        <img
                                                            src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left"><p className="font-bold text-sunset-dark">{trip.title}</p><p className="text-[10px] text-sunset-muted">{trip.dateRange}</p></div>
                                                    <span className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-emerald-500 text-sm fill">check</span></span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {draftTrips.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-black text-sunset-muted uppercase tracking-widest px-1 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-xs text-amber-500">edit_note</span>
                                                Rascunhos
                                            </h3>
                                            {draftTrips.map(trip => (
                                                <button key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="w-full bg-white/70 rounded-2xl p-4 border border-dashed border-terracotta-200 flex items-center gap-4 active:scale-[0.99] transition-all">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden opacity-70">
                                                        <img
                                                            src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left"><p className="font-bold text-sunset-muted">{trip.title}</p><p className="text-[10px] text-sunset-muted">{trip.dateRange || 'Data não definida'}</p></div>
                                                    <span className="material-symbols-outlined text-amber-500 text-sm">edit</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {pastTrips.length > 0 && (
                                        <div className="space-y-2">
                                            <h3 className="text-[10px] font-black text-sunset-muted uppercase tracking-widest px-1 flex items-center gap-2">
                                                <span className="material-symbols-outlined text-xs text-sunset-muted">history</span>
                                                Viagens Passadas
                                            </h3>
                                            {pastTrips.map(trip => (
                                                <button key={trip.id} onClick={() => navigate(`/trip/${trip.id}`)} className="w-full bg-white/50 rounded-2xl p-4 border border-terracotta-100 flex items-center gap-4 active:scale-[0.99] transition-all">
                                                    <div className="w-12 h-12 rounded-xl overflow-hidden opacity-60">
                                                        <img
                                                            src={trip.imageUrl || DEFAULT_TRIP_IMAGE}
                                                            alt=""
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => e.currentTarget.src = DEFAULT_TRIP_IMAGE}
                                                        />
                                                    </div>
                                                    <div className="flex-1 text-left"><p className="font-bold text-sunset-muted">{trip.title}</p><p className="text-[10px] text-sunset-muted">{trip.dateRange}</p></div>
                                                    <span className="material-symbols-outlined text-sunset-muted text-sm">chevron_right</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Create Trip Button */}
                        <button
                            onClick={() => navigate('/add-trip')}
                            className="w-full h-14 bg-terracotta-500 text-white font-bold rounded-2xl shadow-lg shadow-terracotta-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Criar Nova Viagem
                        </button>

                        {/* Empty State */}
                        {vacations.length === 0 && trips.length === 0 && !planningStartDate && (
                            <div className="bg-terracotta-50/50 rounded-2xl p-6 text-center border border-dashed border-terracotta-200">
                                <span className="material-symbols-outlined text-4xl text-terracotta-300">calendar_add_on</span>
                                <p className="font-bold text-sunset-muted mt-2">Comece a planejar!</p>
                                <p className="text-xs text-sunset-muted mt-1">Marque períodos de férias ou crie uma viagem</p>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* State Modal */}
            {showStateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center max-w-[480px] mx-auto px-6">
                    <div className="absolute inset-0 bg-sunset-dark/20 backdrop-blur-sm" onClick={() => setShowStateModal(false)}></div>
                    <div className="relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
                        <div className="bg-warm-cream px-6 py-5 text-center border-b border-terracotta-50">
                            <h2 className="text-lg font-black text-sunset-dark uppercase">Adicionar Feriados Estaduais</h2>
                            <p className="text-xs text-sunset-muted mt-1">Feriados nacionais sempre estarão visíveis</p>
                        </div>

                        {/* Clear Selection */}
                        <div className="px-6 pt-4">
                            <button
                                onClick={() => { setSelectedState(null); setShowStateModal(false); }}
                                className={`w-full p-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${selectedState === null ? 'bg-terracotta-500 text-white' : 'bg-terracotta-50 text-sunset-dark'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-sm">public</span>
                                Apenas Feriados Nacionais
                            </button>
                        </div>

                        <div className="p-4 grid grid-cols-5 gap-2 max-h-[40vh] overflow-y-auto no-scrollbar">
                            {STATES.map(state => (
                                <button
                                    key={state.uf}
                                    onClick={() => { setSelectedState(state.uf); setShowStateModal(false); }}
                                    className={`py-3 rounded-xl font-black text-xs transition-all ${selectedState === state.uf ? 'bg-terracotta-500 text-white shadow-lg' : 'bg-warm-cream text-sunset-dark hover:bg-terracotta-50'
                                        }`}
                                >
                                    {state.uf}
                                </button>
                            ))}
                        </div>

                        <div className="p-6 pt-2">
                            <button
                                onClick={() => setShowStateModal(false)}
                                className="w-full h-12 bg-white border border-terracotta-100 text-sunset-muted font-bold rounded-2xl active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
};

export default Holidays;
