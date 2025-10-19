'use client';

import { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import axiosPublic from '../lib/axios'; // Necesitaremos axios aquí

console.log('axiosPublic.baseURL =', axiosPublic.defaults.baseURL);

interface AuthState {
  user: { 
    id: string; 
    email: string; 
    role: string; // <-- AÑADIDO: El rol del usuario
  } | null;
  accessToken: string | null;
}

interface AuthContextType {
  auth: AuthState;
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  //const [auth, setAuth] = useState<AuthState>({ user: null, accessToken: null });
  const [loading, setLoading] = useState(true); // 1. Añadimos un estado de carga

  const initialAuthState: AuthState = {
    user: null,
    accessToken: null,
  };
  
  const [auth, setAuth] = useState<AuthState>(initialAuthState);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auth/refresh', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',  // ← CRÍTICO: enviar cookies
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setAuth({ user: data.user, accessToken: data.accessToken });
      } catch (error) {
        console.log('No se pudo restaurar la sesión:', error);
        setAuth({ user: null, accessToken: null });
      } finally {
        setLoading(false);
      }
    };
    
    restoreSession();
  }, []);

  // Mientras carga la sesión, podemos mostrar un loader o nada para evitar parpadeos
  if (loading) {
    return <p>Cargando aplicación...</p>; // O un componente de Spinner/Loader
  }

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};