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

    const fetchProfile = async (userId: string) => {
        console.log('[AuthContext] fetchProfile - START for:', userId);
        try {
            const data = await profileService.getProfile(userId);
            console.log('[AuthContext] fetchProfile - SUCCESS. Data found:', !!data);
            setProfile(data);
        } catch (error) {
            console.error('[AuthContext] fetchProfile - FAILED:', error);
            setProfile(null);
        } finally {
            console.log('[AuthContext] fetchProfile - FINISHED. Profile state:', profile ? 'Set' : 'Null');
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
