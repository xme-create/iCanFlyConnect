import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getVolunteerProfile, ensureAnonymousSession } from '../firebase/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthChange(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);
          if (firebaseUser.isAnonymous) {
            setProfile(null);
          } else {
            const vol = await getVolunteerProfile(firebaseUser.uid);
            if (!isMounted) return;
            setProfile(vol);
          }
          if (isMounted) {
            setLoading(false);
          }
          return;
        }

        setUser(null);
        setProfile(null);
        await ensureAnonymousSession();
      } catch (error) {
        console.error('Failed to initialize auth session:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const isVolunteer = !!profile;

  return (
    <AuthContext.Provider value={{ user, profile, loading, isVolunteer }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
