'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const token = localStorage.getItem('hbe_token');
      const storedUser = localStorage.getItem('hbe_user');
      const storedHotel = localStorage.getItem('hbe_hotel');

      if (!token) {
        if (pathname !== '/login' && pathname !== '/register') {
          router.replace('/login');
        }
      } else {
        if (storedUser) setUser(JSON.parse(storedUser));
        if (storedHotel) setHotel(JSON.parse(storedHotel));
      }
    } catch (e) {
      console.error('Failed reading auth state', e);
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem('hbe_token');
    localStorage.removeItem('hbe_user');
    localStorage.removeItem('hbe_hotel');
    setUser(null);
    setHotel(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-slate-500">Loading hotel dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, hotel, setHotel, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
