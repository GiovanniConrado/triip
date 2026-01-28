import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient';
import { profileService, UserProfile } from '../services/profileService';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: UserProfile | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    profile: null,
    isLoading: true,
    refreshProfile: async () => { },
    signOut: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initStarted = useRef(false);
    const fetchingUserRef = useRef<string | null>(null);

    const fetchProfile = async (userId: string, retryCount = 0) => {
        // Redundancy check: If we already have this profile, don't fetch it again
        // unless it's a forced refresh or a retry
        if (profile?.id === userId && retryCount === 0) {
            console.log('[AuthContext] fetchProfile - Profile already in state for:', userId);
            return;
        }

        if (fetchingUserRef.current === userId) {
            console.log('[AuthContext] fetchProfile - Task already in progress for:', userId);
            return;
        }

        fetchingUserRef.current = userId;
        console.log(`[AuthContext] fetchProfile - START (Attempt ${retryCount + 1}) for: ${userId}`);

        try {
            const data = await profileService.getProfile(userId);
            setProfile(data);
            console.log('[AuthContext] fetchProfile - SUCCESS');
        } catch (error: any) {
            console.error('[AuthContext] fetchProfile - FAILED:', error.message);

            // Basic retry logic for timeouts
            if (error.message === 'TIMEOUT' && retryCount < 1) {
                console.log('[AuthContext] fetchProfile - Retrying after timeout...');
                fetchingUserRef.current = null; // Reset to allow retry
                return fetchProfile(userId, retryCount + 1);
            }

            // If it's not a timeout, or we exhausted retries, we might want to keep the current profile 
            // if it exists, or set to null if it's the first fetch.
            // For now, let's not clear it if we already have data to avoid UI flickering
        } finally {
            fetchingUserRef.current = null;
        }
    };

    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    const signOut = async () => {
        console.log('[AuthContext] Signing out...');
        setIsLoading(true);
        try {
            await supabase.auth.signOut();
            setProfile(null);
            setUser(null);
            setSession(null);
        } catch (err) {
            console.error('[AuthContext] Sign out error:', err);
        } finally {
            setIsLoading(false);
            console.log('[AuthContext] Sign out complete');
        }
    };

    useEffect(() => {
        if (initStarted.current) return;
        initStarted.current = true;

        console.log('[AuthContext] Initializing auth...');

        // Failsafe timeout: Force isLoading to false after 6 seconds no matter what
        const failsafe = setTimeout(() => {
            if (isLoading) {
                console.warn('[AuthContext] Failsafe triggered: forcing isLoading to false');
                setIsLoading(false);
            }
        }, 6000);

        const initializeAuth = async () => {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                console.log('[AuthContext] Initial session:', initialSession ? 'Found' : 'None');

                setSession(initialSession);

                if (initialSession?.user) {
                    // Verify if user still exists (handles cases where user was deleted in Supabase)
                    const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();

                    if (error || !verifiedUser) {
                        console.warn('[AuthContext] Session found but user is invalid/deleted. Clearing session.');
                        await supabase.auth.signOut();
                        setSession(null);
                        setUser(null);
                    } else {
                        console.log('[AuthContext] User verified:', verifiedUser.email);
                        setUser(verifiedUser);
                        await fetchProfile(verifiedUser.id);
                    }
                }
            } catch (err) {
                console.error('[AuthContext] Init error:', err);
            } finally {
                console.log('[AuthContext] Init complete');
                setIsLoading(false);
                clearTimeout(failsafe);
            }
        };

        initializeAuth();

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
            console.log('[AuthContext] Auth state changed:', event);

            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                await fetchProfile(currentSession.user.id);
            } else {
                setProfile(null);
            }

            setIsLoading(false);
            clearTimeout(failsafe);
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(failsafe);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, session, profile, isLoading, refreshProfile, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
