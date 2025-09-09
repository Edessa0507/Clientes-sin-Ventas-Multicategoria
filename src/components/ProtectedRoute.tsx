import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { UserRole } from '../types/user';
import LoadingSpinner from './LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles = [],
  redirectTo = '/login',
}) => {
  const { user, isLoading, isAuthenticated } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated || !user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Si se especificaron roles permitidos y el usuario no tiene un rol permitido
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.rol)) {
    // Redirigir a la página de dashboard según el rol del usuario
    const roleDashboard = {
      admin: '/admin',
      supervisor: '/supervisor',
      vendedor: '/vendedor',
    }[user.rol] || '/';
    
    return <Navigate to={roleDashboard} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
