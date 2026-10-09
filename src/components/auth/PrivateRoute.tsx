import { Navigate } from "react-router-dom";
import { getAuthenticatedUser } from "@/lib/authSession";
import {
  AppPermission,
  hasExplicitPermissions,
  userHasPermission,
} from "@/config/permissions";

interface PrivateRouteProps {
  children: JSX.Element;
  allowedRoles?: string[];
  permission?: AppPermission;
}

export function PrivateRoute({
  children,
  allowedRoles = [],
  permission,
}: PrivateRouteProps) {
  const user = getAuthenticatedUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (permission) {
    if (hasExplicitPermissions(user)) {
      return userHasPermission(user, permission) ? (
        children
      ) : (
        <Navigate to="/unauthorized" replace />
      );
    }

    if (user.role === "admin") {
      return children;
    }
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
