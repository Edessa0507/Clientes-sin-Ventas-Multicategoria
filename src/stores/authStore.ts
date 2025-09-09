import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { User, UserRole } from '../types/user';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (codigo: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        return user ? roles.includes(user.rol) : false;
      },

      login: async (codigo: string, password?: string): Promise<{ success: boolean; error?: string }> => {
        console.log('Iniciando proceso de login para:', codigo);
        set({ isLoading: true, error: null });
        
        try {
          // Validar entrada
          if (!codigo || codigo.trim().length === 0) {
            throw new Error('Código de vendedor requerido');
          }

          // Verificar si es admin y requiere password
          const isAdmin = codigo.toLowerCase() === 'admin';
          if (isAdmin && !password) {
            throw new Error('La contraseña es requerida para el administrador');
          }
          
          // Llamar a la función de autenticación
          console.log('Llamando a la función de autenticación...');
          const { data, error } = await supabase.functions.invoke('auth-code-login', {
            method: 'POST',
            body: { 
              code: codigo.trim().toUpperCase(), 
              password: password || undefined 
            }
          });
          
          console.log('Respuesta de la función de autenticación:', { data, error });
          
          if (error) {
            console.error('Error en la función de autenticación:', error);
            throw new Error(error.message || 'Error de conexión con el servidor');
          }
          
          if (data?.error) {
            console.error('Error en la respuesta de autenticación:', data.error);
            throw new Error(data.error);
          }
          
          if (!data?.user) {
            console.error('Usuario no encontrado en la respuesta');
            throw new Error('Error en la autenticación: usuario no encontrado');
          }

          // Actualizar el estado con el usuario autenticado
          const userData = data.user;
          const user: User = {
            id: userData.id,
            codigo: userData.codigo,
            nombre: userData.nombre_completo || userData.nombre || 'Usuario',
            rol: userData.rol,
            email: userData.email,
            zona_id: userData.zona_id,
            supervisor_id: userData.supervisor_id,
            ultimo_login: userData.ultimo_login,
            created_at: userData.created_at
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          console.log(`Sesión de ${userData.rol} iniciada correctamente`);
          return { success: true };
        } catch (error: any) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido en la autenticación';
          console.error('Error en el proceso de login:', error);
          set({ 
            error: errorMessage, 
            isLoading: false,
            isAuthenticated: false,
            user: null
          });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        set({ isLoading: true });
        try {
          // Limpiar estado local
          set({ 
            user: null, 
            isAuthenticated: false, 
            isLoading: false,
            error: null 
          });
        } catch (error) {
          console.error('Error durante logout:', error);
          set({ isLoading: false });
        }
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const { state } = JSON.parse(str);
          return { state };
        },
        setItem: (name, newValue) => {
          const str = JSON.stringify({ state: newValue.state });
          localStorage.setItem(name, str);
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({ 
        user: state.user,
        isAuthenticated: state.isAuthenticated 
      }),
    }
  )
);