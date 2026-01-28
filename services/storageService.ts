// VERSION_TIMESTAMP: 2026-01-27T17:08:00
import { supabase } from './supabaseClient';
import { Trip, Expense, Suggestion, TripStatus, Participant, SuggestionComment, TripSummary } from '../types';
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
        user_id: p.user_id,
        role: p.role || 'member'
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
    receiptUrl: data.receipt_url,
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
    if (expense.receiptUrl !== undefined) data.receipt_url = expense.receiptUrl;
    return data;
};

const mapParticipantFromSupabase = (data: any): Participant => ({
    ...data,
    isExternal: data.is_external,
    role: data.role || 'member'
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
    tripsSummary: null as TripSummary[] | null,
    tripDetails: {} as Record<string, Trip>,
    expenses: {} as Record<string, Expense[]>,
    suggestions: {} as Record<string, Suggestion[]>,
    lastFetch: {} as Record<string, number>, // Timestamps
};

// Listeners for cache updates
const listeners: Set<() => void> = new Set();
const subscribe = (fn: () => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};
const notify = () => listeners.forEach(fn => fn());

// Limpa todo o cache
const clearCache = () => {
    cache.trips = null;
    cache.tripsSummary = null;
    cache.tripDetails = {};
    cache.expenses = {};
    cache.suggestions = {};
    notify();
};

// Helpers para as seleções de colunas (Usando * para máxima compatibilidade)
const TRIP_FIELDS = '*';
const PARTICIPANT_FIELDS = '*';
const EXPENSE_FIELDS = '*';
const INSTALLMENT_FIELDS = '*';
const SUGGESTION_FIELDS = '*';

export const storageService = {
    subscribe,
    // Auth helper com cache
    getCurrentUser: async () => {
        if (cache.user) return cache.user;
        const { data: { user } } = await supabase.auth.getUser();
        cache.user = user;
        return user;
    },

    // Trips
    getTripsSummary: async (forceRefresh = false): Promise<TripSummary[]> => {
        const user = await storageService.getCurrentUser();
        if (!user) return [];

        const isStale = !cache.lastFetch['tripsSummary'] || (Date.now() - cache.lastFetch['tripsSummary'] > 60000); // 1 min stale

        if (cache.tripsSummary && !forceRefresh && !isStale) {
            return cache.tripsSummary;
        }

        const fetchPromise = (async () => {
            // Get trips where user is participating (using the new secure function implicitly or directly)
            const { data: tripIdsData } = await supabase
                .from('participants')
                .select('trip_id')
                .eq('user_id', user.id);

            const tripIds = (tripIdsData || []).map(p => p.trip_id);

            const { data, error } = await supabase
                .from('trips')
                .select(`
                    id, title, destination, start_date, end_date, date_range, image_url, status,
                    participants (id, name, avatar),
                    expenses (amount)
                `)
                .or(`user_id.eq.${user.id},id.in.(${tripIds.length > 0 ? tripIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
                .order('start_date', { ascending: true });

            if (error) {
                console.error('Error fetching trips summary:', error);
                return cache.tripsSummary || [];
            }

            const mappedTrips: TripSummary[] = data.map((t: any) => ({
                id: t.id,
                title: t.title,
                destination: t.destination,
                startDate: t.start_date,
                endDate: t.end_date,
                dateRange: t.date_range,
                imageUrl: t.image_url,
                status: t.status,
                participants: t.participants || [],
                totalSpent: (t.expenses || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
            }));

            cache.tripsSummary = mappedTrips;
            cache.lastFetch['tripsSummary'] = Date.now();
            notify();
            return mappedTrips;
        })();

        if (cache.tripsSummary && !forceRefresh) return cache.tripsSummary;
        return fetchPromise;
    },

    getTrips: async (forceRefresh = false): Promise<Trip[]> => {
        const user = await storageService.getCurrentUser();
        if (!user) return [];

        const isStale = !cache.lastFetch['trips'] || (Date.now() - cache.lastFetch['trips'] > 30000); // 30s stale

        if (cache.trips && !forceRefresh && !isStale) {
            return cache.trips;
        }

        // Background update if we have cache
        const fetchPromise = (async () => {
            // BUSCA TRIPS ONDE O USUÁRIO É DONO OU PARTICIPANTE
            const { data: tripIdsData, error: participantError } = await supabase
                .from('participants')
                .select('trip_id')
                .eq('user_id', user.id);

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
                return cache.trips || [];
            }

            const mappedTrips = data.map(mapTripFromSupabase);
            cache.trips = mappedTrips;
            cache.lastFetch['trips'] = Date.now();
            notify();
            return mappedTrips;
        })();

        if (cache.trips && !forceRefresh) {
            return cache.trips;
        }

        return fetchPromise;
    },

    getTripById: async (id: string, forceRefresh = false): Promise<Trip | null> => {
        const isStale = !cache.lastFetch[`trip_${id}`] || (Date.now() - cache.lastFetch[`trip_${id}`] > 30000);

        if (cache.tripDetails[id] && !forceRefresh && !isStale) {
            return cache.tripDetails[id];
        }

        const fetchPromise = (async () => {
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
                return cache.tripDetails[id] || null;
            }

            const mappedTrip = mapTripFromSupabase(data);
            cache.tripDetails[id] = mappedTrip;
            cache.lastFetch[`trip_${id}`] = Date.now();
            notify();
            return mappedTrip;
        })();

        if (cache.tripDetails[id] && !forceRefresh) {
            return cache.tripDetails[id];
        }

        return fetchPromise;
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
        let ownerParticipant: Participant | null = null;
        try {
            const profile = await profileService.getProfile(user.id);
            const { data: pData, error: pError } = await supabase
                .from('participants')
                .insert([{
                    trip_id: data.id,
                    name: profile?.full_name || user.email?.split('@')[0] || 'Eu',
                    email: user.email,
                    avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile?.full_name || 'Eu')}&background=random`,
                    is_external: false,
                    user_id: user.id,
                    role: 'admin'
                }])
                .select()
                .single();

            if (pError) throw pError;
            if (pData) ownerParticipant = mapParticipantFromSupabase(pData);
        } catch (err: any) {
            console.error('[storageService] Failed to add owner as participant. This is often an RLS policy issue:', err.message || err);
        }

        clearCache(); // Invalida o cache
        const trip = mapTripFromSupabase(data);
        if (ownerParticipant) {
            trip.participants = [ownerParticipant];
        }
        return trip;
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
    getExpensesByTrip: async (tripId: string, forceRefresh = false): Promise<Expense[]> => {
        const isStale = !cache.lastFetch[`expenses_${tripId}`] || (Date.now() - cache.lastFetch[`expenses_${tripId}`] > 30000);

        if (cache.expenses[tripId] && !forceRefresh && !isStale) {
            return cache.expenses[tripId];
        }

        const fetchPromise = (async () => {
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
                return cache.expenses[tripId] || [];
            }

            const mappedExpenses = data.map(mapExpenseFromSupabase);
            cache.expenses[tripId] = mappedExpenses;
            cache.lastFetch[`expenses_${tripId}`] = Date.now();
            notify();
            return mappedExpenses;
        })();

        if (cache.expenses[tripId] && !forceRefresh) {
            return cache.expenses[tripId];
        }

        return fetchPromise;
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
            console.error('[storageService] CRITICAL Error creating expense:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint,
                payloadSent: mapExpenseToSupabase(mainData)
            });
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
    getSuggestionsByTrip: async (tripId: string, forceRefresh = false): Promise<Suggestion[]> => {
        const isStale = !cache.lastFetch[`suggestions_${tripId}`] || (Date.now() - cache.lastFetch[`suggestions_${tripId}`] > 30000);

        if (cache.suggestions[tripId] && !forceRefresh && !isStale) {
            return cache.suggestions[tripId];
        }

        const fetchPromise = (async () => {
            const { data, error } = await supabase
                .from('suggestions')
                .select(`
                    *,
                    suggestion_comments (
                        *,
                        profiles (*)
                    )
                `)
                .eq('trip_id', tripId);

            if (error) {
                console.error('Error fetching suggestions:', error);
                return cache.suggestions[tripId] || [];
            }

            const mappedSuggestions = data.map(mapSuggestionFromSupabase);
            cache.suggestions[tripId] = mappedSuggestions;
            cache.lastFetch[`suggestions_${tripId}`] = Date.now();
            notify();
            return mappedSuggestions;
        })();

        if (cache.suggestions[tripId] && !forceRefresh) {
            return cache.suggestions[tripId];
        }

        return fetchPromise;
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
                is_external: participant.isExternal || false,
                role: participant.role || 'member'
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

    removeParticipantFromTrip: async (participantId: string): Promise<{ success: boolean; error?: string }> => {
        const { error, count } = await supabase
            .from('participants')
            .delete({ count: 'exact' })
            .eq('id', participantId);

        if (error) {
            console.error('Error removing participant:', error);
            // Translate weird Postgres errors if possible, or return generic
            return { success: false, error: 'Erro de banco de dados: ' + error.message };
        }

        if (count === 0) {
            console.error('No participant deleted. Possible RLS restriction.');
            return { success: false, error: 'Não foi possível excluir. Verifique se você é Admin e se o SQL de permissão (RLS) foi executado.' };
        }

        clearCache();
        return { success: true };
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
                is_external: false,
                role: 'member'
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

        // 3. Update suggestions where the participant was the confirmer
        const { error: suggestionError } = await supabase
            .from('suggestions')
            .update({ confirmed_by: toId })
            .eq('confirmed_by', fromId);

        if (suggestionError) {
            console.error('Error updating suggestion confirmation during merge:', suggestionError);
            return false;
        }

        // 4. Update suggestion comments where the participant was the author
        // Note: suggestion_comments uses user_id, but for internal migrations 
        // we might be merging external participants which don't have user_id yet.
        // If we are merging two participants, we should also check if we need to 
        // migrate specific things in the UI metadata.
        // For now, let's ensure we migrate anything else tied to fromId if it exists.

        // 5. Delete the external participant
        const { error: deleteError } = await supabase
            .from('participants')
            .delete()
            .eq('id', fromId);

        if (deleteError) {
            console.error('Error deleting merged participant:', deleteError);
            // Some db constraints might prevent deletion if we missed something
            // Try to see if there's a reference in suggestion_comments
            return false;
        }

        clearCache();
        return true;
    },

    updateParticipantRole: async (participantId: string, role: 'admin' | 'member'): Promise<boolean> => {
        const { error } = await supabase
            .from('participants')
            .update({ role })
            .eq('id', participantId);

        if (error) {
            console.error('Error updating participant role:', error);
            return false;
        }

        clearCache();
        return true;
    },

    isAdmin: async (tripId: string): Promise<boolean> => {
        const user = await storageService.getCurrentUser();
        if (!user) return false;

        const { data, error } = await supabase
            .from('participants')
            .select('role')
            .eq('trip_id', tripId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (error || !data) return false;
        return data.role === 'admin';
    }
};
