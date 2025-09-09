import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User, UserRole } from '../types/user';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (codigo: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  initializeAuth: () => () => void;
  clearError: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      hasRole: (roles: UserRole[]) => {
        const { user } = get();
        return user ? roles.includes(user.rol) : false;
      },

      login: async (codigo: string, password?: string): Promise<{ success: boolean; error?: string }> => {
        console.log('Iniciando proceso de login para:', codigo);
        set({ isLoading: true, error: null });
        
        try {
          // Verificar si es un intento de inicio de sesión de administrador
          const isAdmin = codigo.toLowerCase() === 'admin';
          
          if (isAdmin && !password) {
            return { success: false, error: 'La contraseña es requerida para el administrador.' };
          }
          
          // Usar la función de autenticación personalizada
          console.log('Llamando a la función de autenticación...');
          const { data, error } = await supabase.functions.invoke('auth-code-login', {
            method: 'POST',
            body: { code: codigo, password: password || undefined },
            // No enviar claves sensibles desde el frontend
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Info': 'edessa-web/1.0.0'
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
          set({
            user: {
              id: userData.id,
              codigo: userData.codigo,
              nombre: userData.nombre_completo || userData.nombre || 'Usuario',
              rol: userData.rol,
              email: userData.email,
              zona_id: userData.zona_id,
              supervisor_id: userData.supervisor_id,
              ultimo_login: userData.ultimo_login,
              created_at: userData.created_at
            },
            session: data.session || { user: { id: userData.id } } as any, // Type assertion for session
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
            user: null,
            session: null
          });
          return { success: false, error: errorMessage };
        }
      },

      logout: async () => {
        set({ isLoading: true })
        await supabase.auth.signOut()
        set({ user: null, session: null, isAuthenticated: false, isLoading: false })
      },
      
      initializeAuth: () => {
        // Verificar si hay una sesión activa al cargar la aplicación
        const checkSession = async () => {
          try {
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) throw error;
            
            if (session) {
              // Obtener el perfil del usuario desde nuestra tabla personalizada
              const { data: userData, error: userError } = await supabase
                .from('auth_users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (userError) throw userError;

              set({
                session,
                user: {
                  id: userData.id,
                  codigo: userData.codigo,
                  nombre: userData.nombre_completo,
                  rol: userData.rol,
                  email: userData.email,
                  zona_id: userData.zona_id,
                  supervisor_id: userData.supervisor_id,
                  ultimo_login: userData.ultimo_login,
                  created_at: userData.created_at
                },
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
          } catch (error) {
            console.error('Error al inicializar autenticación:', error);
            set({ isLoading: false });
          }
        };

        checkSession();

        // Escuchar cambios en la autenticación
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Cambio en el estado de autenticación:', event);
            
            if (event === 'SIGNED_IN' && session) {
              // Obtener el perfil del usuario
              const { data: userData, error } = await supabase
                .from('auth_users')
                .select('*')
                .eq('id', session.user.id)
                .single();

              if (error) {
                console.error('Error al obtener el perfil:', error);
                set({ session, isAuthenticated: true, isLoading: false });
                return;
              }

              set({
                session,
                user: {
                  id: userData.id,
                  codigo: userData.codigo,
                  nombre: userData.nombre_completo,
                  rol: userData.rol,
                  email: userData.email,
                  zona_id: userData.zona_id,
                  supervisor_id: userData.supervisor_id,
                  ultimo_login: userData.ultimo_login,
                  created_at: userData.created_at
                },
                isAuthenticated: true,
                isLoading: false,
              });
            } else if (event === 'SIGNED_OUT') {
              set({
                session: null,
                user: null,
                isAuthenticated: false,
                isLoading: false,
              });
            } else {
              set({ isLoading: false });
            }
          }
        );

        // Retornar función de limpieza
        return () => {
          subscription.unsubscribe();
        };
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'auth-storage',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const { state } = JSON.parse(str)
          return {
            state: {
              ...state,
              session: state.session,
            },
          }
        },
        setItem: (name, newValue) => {
          const str = JSON.stringify({
            state: {
              ...newValue.state,
            },
          })
          localStorage.setItem(name, str)
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
      partialize: (state) => ({ session: state.session }),
    }
  )
)
