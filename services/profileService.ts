import { supabase } from './supabaseClient';

export interface UserProfile {
    id: string;
    full_name: string;
    username: string;
    bio?: string;
    avatar_url?: string;
    updated_at: string;
}

export const profileService = {
    async getProfile(userId: string): Promise<UserProfile | null> {
        console.log('[profileService] getProfile - Querying for:', userId);

        // Timeout after 15 seconds (increased from 5s)
        const timeoutPromise = new Promise<null>((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), 15000);
        });

        const queryPromise = (async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            if (error) {
                console.error('[profileService] getProfile DB Error:', error.code, error.message);
                if (error.code === 'PGRST116') return null; // Not found
                throw error;
            }
            return data;
        })();

        try {
            const result = await Promise.race([queryPromise, timeoutPromise]);
            console.log('[profileService] getProfile result:', result ? 'Found' : 'Null');
            return result;
        } catch (error: any) {
            console.error('[profileService] getProfile error:', error.message);
            throw error;
        }
    },

    async createProfile(profile: UserProfile): Promise<UserProfile | null> {
        // Only send bio if it has value to avoid schema errors if column is missing
        const { bio, ...rest } = profile;
        const payload = profile.bio ? profile : rest;

        const { data, error } = await supabase
            .from('profiles')
            .upsert([payload])
            .select()
            .single();

        if (error) {
            console.error('[profileService] Create error:', error.code, error.message);
            throw error;
        }
        return data;
    },

    async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
        const { data, error } = await supabase
            .from('profiles')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    async checkUsernameAvailable(username: string, userId: string): Promise<boolean> {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', username)
            .neq('id', userId)
            .maybeSingle();

        if (error) throw error;
        return !data;
    }
};
