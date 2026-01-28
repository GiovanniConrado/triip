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
        const startTime = Date.now();
        console.log(`[profileService] getProfile START - ${userId}`);

        const queryPromise = (async () => {
            try {
                // Use maybeSingle to avoid errors if no profile exists
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', userId)
                    .maybeSingle();

                if (error) {
                    console.error('[profileService] DB Error:', error.code, error.message);
                    throw error;
                }
                return data;
            } catch (err: any) {
                console.error(`[profileService] Query Crash - ${userId}:`, err.message);
                throw err;
            }
        })();

        // We wrap the race in a timeout logic but we wait up to 25s
        // Usually, if it doesn't return in 5-10s, something is wrong.
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('TIMEOUT')), 25000);
        });

        try {
            const result = await Promise.race([queryPromise, timeoutPromise]);
            console.log(`[profileService] getProfile END - FOUND: ${!!result} in ${Date.now() - startTime}ms`);
            return result;
        } catch (error: any) {
            console.error(`[profileService] getProfile FATAL - ${userId} after ${Date.now() - startTime}ms:`, error.message);
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
