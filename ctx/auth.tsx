import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  signInAsGuest: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({ 
  session: null, 
  isLoading: true, 
  isGuest: false, 
  signInAsGuest: () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    // Check if user previously logged in as guest
    AsyncStorage.getItem('esprit_guest').then(val => {
      if (val === 'true') {
        setIsGuest(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInAsGuest = () => {
    setIsGuest(true);
    AsyncStorage.setItem('esprit_guest', 'true');
  };

  const signOut = async () => {
    setIsGuest(false);
    await AsyncStorage.removeItem('esprit_guest');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, isGuest, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
