// VERSION_TIMESTAMP: 2026-01-27T17:08:00
import { supabase } from './supabaseClient';
import { Trip, Expense, Suggestion, TripStatus, Participant, SuggestionComment } from '../types';
import { profileService } from './profileService';

// O storageService agora usará o Supabase em vez do localStorage.
// Todas as funções foram transformadas em assíncronas (async).

const mapTripFromSupabase = (data: any): Trip => ({
    ...data,
    dateRange: data.date_range,
    startDate: data.start_date,
    endDate: data.end_date,
    imageUrl: data.image_url,
    tripType: data.trip_type,
    financeMode: data.finance_mode,
    participants: data.participants?.map((p: any) => ({
        ...p,
        isExternal: p.is_external,
        user_id: p.user_id
    })) || [],
    expenses: data.expenses?.map(mapExpenseFromSupabase) || []
});

const mapTripToSupabase = (trip: Partial<Trip>) => {
    const data: any = {};
    if (trip.title !== undefined) data.title = trip.title;
    if (trip.destination !== undefined) data.destination = trip.destination;
    if (trip.dateRange !== undefined) data.date_range = trip.dateRange;
    if (trip.startDate !== undefined) data.start_date = trip.startDate;
    if (trip.endDate !== undefined) data.end_date = trip.endDate;
    if (trip.imageUrl !== undefined) data.image_url = trip.imageUrl;
    if (trip.budget !== undefined) data.budget = trip.budget;
    if (trip.status !== undefined) data.status = trip.status;
    if (trip.tripType !== undefined) data.trip_type = trip.tripType;
    if (trip.financeMode !== undefined) data.finance_mode = trip.financeMode;
    return data;
};

const mapExpenseFromSupabase = (data: any): Expense => ({
    ...data,
    tripId: data.trip_id,
    paidBy: data.paid_by,
    paymentMethod: data.payment_method,
    participants: data.expense_division?.map((ed: any) => ed.participant_id) || [],
    installment: (data.installments?.[0] || data.installment) ? {
        total: (data.installments?.[0] || data.installment).total_count,
        paid: (data.installments?.[0] || data.installment).paid_count,
        firstDueDate: (data.installments?.[0] || data.installment).first_due_date,
        amount: (data.installments?.[0] || data.installment).amount
    } : undefined
});

const mapExpenseToSupabase = (expense: Partial<Expense>) => {
    const data: any = {};
    if (expense.tripId !== undefined) data.trip_id = expense.tripId;
    if (expense.category !== undefined) data.category = expense.category;
    if (expense.amount !== undefined) data.amount = expense.amount;
    if (expense.paidBy !== undefined) data.paid_by = expense.paidBy;
    if (expense.status !== undefined) data.status = expense.status;
    if (expense.date !== undefined) data.date = expense.date;
    if (expense.description !== undefined) data.description = expense.description;
    if (expense.paymentMethod !== undefined) data.payment_method = expense.paymentMethod;
    return data;
};

const mapParticipantFromSupabase = (data: any): Participant => ({
    ...data,
    isExternal: data.is_external
});

const mapSuggestionFromSupabase = (data: any): Suggestion => ({
    ...data,
    tripId: data.trip_id,
    imageUrl: data.image_url,
    externalUrl: data.external_url,
    externalType: data.external_type,
    confirmedBy: data.confirmed_by,
    comments: data.suggestion_comments?.map((c: any) => ({
        ...c,
        suggestionId: c.suggestion_id,
        userId: c.user_id,
        userName: c.user_name,
        userAvatar: c.user_avatar,
        createdAt: c.created_at
    })) || []
});

const mapSuggestionToSupabase = (suggestion: Partial<Suggestion>) => {
    const data: any = {};
    if (suggestion.tripId !== undefined) data.trip_id = suggestion.tripId;
    if (suggestion.title !== undefined) data.title = suggestion.title;
    if (suggestion.category !== undefined) data.category = suggestion.category;
    if (suggestion.location !== undefined) data.location = suggestion.location;
    if (suggestion.price !== undefined) data.price = suggestion.price;
    if (suggestion.rating !== undefined) data.rating = suggestion.rating;
    if (suggestion.imageUrl !== undefined) data.image_url = suggestion.imageUrl;
    if (suggestion.description !== undefined) data.description = suggestion.description;
    if (suggestion.status !== undefined) data.status = suggestion.status;
    if (suggestion.confirmedBy !== undefined) data.confirmed_by = suggestion.confirmedBy;
    if (suggestion.externalUrl !== undefined) data.external_url = suggestion.externalUrl;
    if (suggestion.externalType !== undefined) data.external_type = suggestion.externalType;
    return data;
};

// Cache em memória para evitar chamadas de rede repetitivas
const cache = {
    user: null as any,
    trips: null as Trip[] | null,
    tripDetails: {} as Record<string, Trip>,
    expenses: {} as Record<string, Expense[]>,
    suggestions: {} as Record<string, Suggestion[]>,
};

// Limpa todo o cache
const clearCache = () => {
    cache.trips = null;
    cache.tripDetails = {};
    cache.expenses = {};
    cache.suggestions = {};
};

// Helpers para as seleções de colunas (Usando * para máxima compatibilidade)
const TRIP_FIELDS = '*';
const PARTICIPANT_FIELDS = '*';
const EXPENSE_FIELDS = '*';
const INSTALLMENT_FIELDS = '*';
const SUGGESTION_FIELDS = '*';

export const storageService = {
    // Auth helper com cache
    getCurrentUser: async () => {
        if (cache.user) return cache.user;
        const { data: { user } } = await supabase.auth.getUser();
        cache.user = user;
        return user;
    },

    // Trips
    getTrips: async (): Promise<Trip[]> => {
        const user = await storageService.getCurrentUser();
        if (!user) return [];

        if (cache.trips) return cache.trips;

        // BUSCA TRIPS ONDE O USUÁRIO É DONO OU PARTICIPANTE
        const { data: tripIdsData, error: participantError } = await supabase
            .from('participants')
            .select('trip_id')
            .eq('user_id', user.id);

        if (participantError) {
            console.error('Error fetching participant trips:', participantError);
        }

        const tripIds = (tripIdsData || []).map(p => p.trip_id);

        const { data, error } = await supabase
            .from('trips')
            .select(`
                *,
                participants (*),
                expenses (
                    *,
                    installments (*),
                    expense_division (participant_id)
                )
            `)
            .or(`user_id.eq.${user.id},id.in.(${tripIds.length > 0 ? tripIds.join(',') : '00000000-0000-0000-0000-000000000000'})`);

        if (error) {
            console.error('Error fetching trips:', error);
            return [];
        }

        const mappedTrips = data.map(mapTripFromSupabase);
        cache.trips = mappedTrips;
        return mappedTrips;
    },

    getTripById: async (id: string): Promise<Trip | null> => {
        if (cache.tripDetails[id]) return cache.tripDetails[id];

        const { data, error } = await supabase
            .from('trips')
            .select(`
                *,
                participants (*),
                expenses (
                    *,
                    installments (*),
                    expense_division (participant_id)
                )
            `)
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching trip by id:', error);
            return null;
        }

        const mappedTrip = mapTripFromSupabase(data);
        cache.tripDetails[id] = mappedTrip;
        return mappedTrip;
    },

    createTrip: async (tripData: any): Promise<Trip | null> => {
        const user = await storageService.getCurrentUser();
        if (!user) return null;

        const { data, error } = await supabase
            .from('trips')
            .insert([{
                ...mapTripToSupabase(tripData),
                user_id: user.id,
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) {
            console.error('Error creating trip:', error);
            return null;
        }

        // AUTO-ADD OWNER AS PARTICIPANT
        try {
            const profile = await profileService.getProfile(user.id);
            await supabase
                .from('participants')
                .insert([{
                    trip_id: data.id,
                    name: profile?.full_name || user.email?.split('@')[0] || 'Eu',
                    email: user.email,
                    avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'Eu')}&background=random`,
                    is_external: false,
                    user_id: user.id
                }]);
        } catch (err) {
            console.error('Failed to add owner as participant:', err);
        }

        clearCache(); // Invalida o cache
        return mapTripFromSupabase(data);
    },

    updateTrip: async (id: string, updates: Partial<Trip>): Promise<Trip | null> => {
        const { data, error } = await supabase
            .from('trips')
            .update({
                ...mapTripToSupabase(updates),
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating trip:', error);
            return null;
        }

        clearCache(); // Invalida o cache
        return mapTripFromSupabase(data);
    },

    deleteTrip: async (id: string): Promise<boolean> => {
        const { error } = await supabase
            .from('trips')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting trip:', error);
            return false;
        }

        clearCache(); // Invalida o cache
        return true;
    },

    // Expenses
    getExpensesByTrip: async (tripId: string): Promise<Expense[]> => {
        if (cache.expenses[tripId]) return cache.expenses[tripId];

        const { data, error } = await supabase
            .from('expenses')
            .select(`
                *,
                installments (*),
                expense_division (participant_id)
            `)
            .eq('trip_id', tripId);

        if (error) {
            console.error('Error fetching expenses:', error);
            return [];
        }

        const mappedExpenses = data.map(mapExpenseFromSupabase);
        cache.expenses[tripId] = mappedExpenses;
        return mappedExpenses;
    },

    createExpense: async (expenseData: Omit<Expense, 'id'>): Promise<Expense | null> => {
        const { participants, installment, ...mainData } = expenseData as any;

        const { data: expense, error } = await supabase
            .from('expenses')
            .insert([{
                ...mapExpenseToSupabase(mainData),
                trip_id: expenseData.tripId,
                paid_by: expenseData.paidBy
            }])
            .select()
            .single();

        if (error || !expense) {
            console.error('Error creating expense:', error?.message || 'Unknown error');
            return null;
        }

        if (installment) {
            await supabase.from('installments').insert([{
                expense_id: expense.id,
                total_count: installment.total,
                paid_count: installment.paid,
                first_due_date: installment.firstDueDate,
                amount: installment.amount
            }]);
        }

        if (participants && participants.length > 0) {
            const divisions = participants.map((pId: string) => ({
                expense_id: expense.id,
                participant_id: pId
            }));
            await supabase.from('expense_division').insert(divisions);
        }

        delete cache.expenses[expenseData.tripId]; // Invalida cache específico
        delete cache.tripDetails[expenseData.tripId]; // Invalida o detalhe da viagem que contém despesas
        return mapExpenseFromSupabase(expense);
    },

    updateExpense: async (id: string, updates: Partial<Expense>): Promise<Expense | null> => {
        const { participants, installment, ...mainUpdates } = updates as any;

        const { data: expenseData, error } = await supabase
            .from('expenses')
            .update(mapExpenseToSupabase(mainUpdates))
            .eq('id', id)
            .select(`
                *,
                expense_division (participant_id),
                installments (*)
            `)
            .single();

        if (error) {
            console.error('Error updating expense:', error.message, error.details, error.hint);
            return null;
        }

        if (participants !== undefined) {
            await supabase.from('expense_division').delete().eq('expense_id', id);
            if (participants && participants.length > 0) {
                const divisions = participants.map((pId: string) => ({
                    expense_id: id,
                    participant_id: pId
                }));
                await supabase.from('expense_division').insert(divisions);
            }
        }

        if (installment !== undefined) {
            await supabase.from('installments').delete().eq('expense_id', id);
            if (installment) {
                await supabase.from('installments').insert([{
                    expense_id: id,
                    total_count: installment.total,
                    paid_count: installment.paid,
                    first_due_date: installment.firstDueDate,
                    amount: installment.amount
                }]);
            }
        }

        const { data: updatedExpense, error: reloadError } = await supabase
            .from('expenses')
            .select(`
                *,
                expense_division (participant_id),
                installments (*)
            `)
            .eq('id', id)
            .single();

        if (updates.tripId) {
            delete cache.expenses[updates.tripId];
            delete cache.tripDetails[updates.tripId];
        } else {
            clearCache(); // Por segurança, se não soubermos a tripId
        }

        if (reloadError) return mapExpenseFromSupabase(expenseData);
        return mapExpenseFromSupabase(updatedExpense);
    },

    deleteExpense: async (id: string): Promise<boolean> => {
        const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting expense:', error);
            return false;
        }

        clearCache(); // Invalida tudo por segurança
        return true;
    },

    // Suggestions
    getSuggestionsByTrip: async (tripId: string): Promise<Suggestion[]> => {
        if (cache.suggestions[tripId]) return cache.suggestions[tripId];

        const { data, error } = await supabase
            .from('suggestions')
            .select(`
                *,
                suggestion_comments(*)
            `)
            .eq('trip_id', tripId);

        if (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }

        const mappedSuggestions = data.map(mapSuggestionFromSupabase);
        cache.suggestions[tripId] = mappedSuggestions;
        return mappedSuggestions;
    },

    createSuggestion: async (suggestionData: Omit<Suggestion, 'id'>): Promise<Suggestion | null> => {
        const { data, error } = await supabase
            .from('suggestions')
            .insert([mapSuggestionToSupabase(suggestionData)])
            .select()
            .single();

        if (error) {
            console.error('Error creating suggestion:', error);
            return null;
        }

        delete cache.suggestions[suggestionData.tripId];
        return mapSuggestionFromSupabase(data);
    },

    updateSuggestion: async (id: string, updates: Partial<Suggestion>): Promise<Suggestion | null> => {
        const { data, error } = await supabase
            .from('suggestions')
            .update(mapSuggestionToSupabase(updates))
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating suggestion:', error);
            return null;
        }

        if (updates.tripId) delete cache.suggestions[updates.tripId];
        else clearCache();

        return mapSuggestionFromSupabase(data);
    },

    deleteSuggestion: async (id: string): Promise<boolean> => {
        const { error } = await supabase
            .from('suggestions')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting suggestion:', error);
            return false;
        }

        clearCache();
        return true;
    },

    // Participants
    addParticipantToTrip: async (tripId: string, participant: Omit<Participant, 'id'>): Promise<Participant | null> => {
        const { data, error } = await supabase
            .from('participants')
            .insert([{
                trip_id: tripId,
                name: participant.name,
                email: participant.email,
                avatar: participant.avatar,
                is_external: participant.isExternal || false
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding participant:', error);
            return null;
        }

        delete cache.tripDetails[tripId];
        cache.trips = null;
        return mapParticipantFromSupabase(data);
    },

    removeParticipantFromTrip: async (participantId: string): Promise<boolean> => {
        const { error } = await supabase
            .from('participants')
            .delete()
            .eq('id', participantId);

        if (error) {
            console.error('Error removing participant:', error);
            return false;
        }

        clearCache();
        return true;
    },

    // Comments
    getCommentsBySuggestion: async (suggestionId: string): Promise<SuggestionComment[]> => {
        const { data, error } = await supabase
            .from('suggestion_comments')
            .select('*')
            .eq('suggestion_id', suggestionId);

        if (error) {
            console.error('Error fetching comments:', error);
            return [];
        }
        return data as SuggestionComment[];
    },

    createComment: async (commentData: Omit<SuggestionComment, 'id' | 'createdAt'>): Promise<SuggestionComment | null> => {
        const { data, error } = await supabase
            .from('suggestion_comments')
            .insert([commentData])
            .select()
            .single();

        if (error) {
            console.error('Error creating comment:', error);
            return null;
        }

        clearCache(); // Invalida para resubmeter sugestões com novos comentários
        return data as SuggestionComment;
    },

    // Join Trip Logic
    joinTrip: async (tripId: string): Promise<boolean> => {
        const user = await storageService.getCurrentUser();
        if (!user) return false;

        const { data: existing } = await supabase
            .from('participants')
            .select('id')
            .eq('trip_id', tripId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing) return true;

        const profile = await profileService.getProfile(user.id);

        const { error } = await supabase
            .from('participants')
            .insert([{
                trip_id: tripId,
                user_id: user.id,
                name: profile?.full_name || user.email?.split('@')[0] || 'Novo Viajante',
                email: user.email,
                avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'EU')}&background=random`,
                is_external: false
            }]);

        if (error) {
            console.error('Error joining trip:', error);
            return false;
        }

        clearCache();
        return true;
    },

    // Participant Merge Logic
    mergeParticipants: async (fromId: string, toId: string): Promise<boolean> => {
        // 1. Update expenses where the participant was the payer
        const { error: payerError } = await supabase
            .from('expenses')
            .update({ paid_by: toId })
            .eq('paid_by', fromId);

        if (payerError) {
            console.error('Error updating payer during merge:', payerError);
            return false;
        }

        // 2. Update divisions where the participant was involved
        // We first find if there are any overlaps (both in the same expense)
        const { data: overlaps } = await supabase
            .from('expense_division')
            .select('expense_id')
            .eq('participant_id', toId);

        const toIdExpenses = new Set(overlaps?.map(o => o.expense_id) || []);

        const { data: divisionsToUpdate } = await supabase
            .from('expense_division')
            .select('*')
            .eq('participant_id', fromId);

        if (divisionsToUpdate && divisionsToUpdate.length > 0) {
            for (const div of divisionsToUpdate) {
                if (toIdExpenses.has(div.expense_id)) {
                    // Conflict: Both were already in this expense. Just delete the old division.
                    await supabase
                        .from('expense_division')
                        .delete()
                        .eq('id', div.id);
                } else {
                    // No conflict: Update the participant_id
                    await supabase
                        .from('expense_division')
                        .update({ participant_id: toId })
                        .eq('id', div.id);
                }
            }
        }

        // 3. Delete the external participant
        const { error: deleteError } = await supabase
            .from('participants')
            .delete()
            .eq('id', fromId);

        if (deleteError) {
            console.error('Error deleting merged participant:', deleteError);
            return false;
        }

        clearCache();
        return true;
    },
};
