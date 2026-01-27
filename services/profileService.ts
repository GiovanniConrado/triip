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
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // Not found
            throw error;
        }
        return data;
    },

    async createProfile(profile: UserProfile): Promise<UserProfile | null> {
        // Only send bio if it has value to avoid schema errors if column is missing
        const { bio, ...rest } = profile;
        const payload = profile.bio ? profile : rest;

        const { data, error } = await supabase
            .from('profiles')
            .insert([payload])
            .select()
            .single();

        if (error) {
            console.error('[profileService] Create error:', error);
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
