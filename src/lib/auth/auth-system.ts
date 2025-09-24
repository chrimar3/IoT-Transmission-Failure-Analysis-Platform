/**
 * Production Authentication System
 * Comprehensive auth system with role-based access control
 * - Integration with Supabase Auth
 * - Role-based permissions (viewer, analyst, admin, super_admin)
 * - Session management and security
 * - Audit logging for access control
 */

import { createServerClient } from '../supabase-server';
import { _supabase } from '../supabase';
import { validationService } from '../database/validation-service';
import { UserProfile } from '../database/schema-types';

export type UserRole = 'viewer' | 'analyst' | 'admin' | 'super_admin';

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
  role: UserRole;
  department?: string;
  permissions: UserPermissions;
  isActive: boolean;
  lastLogin?: string;
}

export interface UserPermissions {
  // Data access permissions
  canViewData: boolean;
  canExportData: boolean;
  canViewSensitiveMetrics: boolean;

  // Analysis permissions
  canRunAnalysis: boolean;
  canCreateValidationSessions: boolean;
  canViewAuditTrails: boolean;

  // Administrative permissions
  canManageUsers: boolean;
  canManageSystemConfig: boolean;
  canAccessRawData: boolean;
  canDeleteData: boolean;

  // Advanced permissions
  canModifyCalculations: boolean;
  canOverrideValidation: boolean;
  canManageBackups: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials extends LoginCredentials {
  fullName: string;
  department?: string;
  requestedRole?: UserRole;
}

export interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
  sessionToken?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordUpdateRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Production Authentication Service
 * Handles all authentication and authorization logic
 */
export class AuthenticationService {
  private supabaseClient = createServerClient();

  /**
   * User Authentication Methods
   */

  async signIn(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log(`🔐 Sign in attempt for: ${credentials.email}`);

      // Authenticate with Supabase
      const { data, error } = await this.supabaseClient.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password
      });

      if (error) {
        console.error('Authentication failed:', error.message);
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Authentication failed - no user data returned'
        };
      }

      // Get user profile
      const userProfile = await this.getUserProfile(data.user.id);

      if (!userProfile) {
        return {
          success: false,
          error: 'User profile not found - please contact administrator'
        };
      }

      if (!userProfile.is_active) {
        return {
          success: false,
          error: 'Account is deactivated - please contact administrator'
        };
      }

      // Update last login
      await this.updateLastLogin(data.user.id);

      // Log access
      await validationService.logAccess('login', 'authentication', data.user.id);

      const authUser = this.mapToAuthUser(userProfile);

      console.log(`✅ Sign in successful for: ${credentials.email} (${authUser.role})`);

      return {
        success: true,
        user: authUser,
        sessionToken: data.session?.access_token
      };

    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        error: 'Authentication service unavailable'
      };
    }
  }

  async signUp(credentials: SignupCredentials): Promise<AuthResult> {
    try {
      console.log(`👤 Sign up attempt for: ${credentials.email}`);

      // Create auth user in Supabase
      const { data, error } = await this.supabaseClient.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          data: {
            full_name: credentials.fullName,
            department: credentials.department
          }
        }
      });

      if (error) {
        console.error('Sign up failed:', error.message);
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: 'Sign up failed - no user data returned'
        };
      }

      // Create user profile
      const defaultRole: UserRole = credentials.requestedRole === 'admin' ? 'viewer' : (credentials.requestedRole || 'viewer');
      await this.createUserProfile(data.user.id, {
        email: credentials.email,
        fullName: credentials.fullName,
        role: defaultRole,
        department: credentials.department
      });

      // Log access
      await validationService.logAccess('signup', 'authentication', data.user.id);

      console.log(`✅ Sign up successful for: ${credentials.email}`);

      return {
        success: true,
        user: {
          id: data.user.id,
          email: credentials.email,
          fullName: credentials.fullName,
          role: defaultRole,
          department: credentials.department,
          permissions: this.getPermissionsForRole(defaultRole),
          isActive: true
        }
      };

    } catch (error) {
      console.error('Sign up error:', error);
      return {
        success: false,
        error: 'Registration service unavailable'
      };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🚪 Sign out initiated');

      const { error } = await this.supabaseClient.auth.signOut();

      if (error) {
        console.error('Sign out failed:', error.message);
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      console.log('✅ Sign out successful');
      return { success: true };

    } catch (error) {
      console.error('Sign out error:', error);
      return {
        success: false,
        error: 'Sign out failed'
      };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();

      if (!user) {
        return null;
      }

      const userProfile = await this.getUserProfile(user.id);

      if (!userProfile || !userProfile.is_active) {
        return null;
      }

      return this.mapToAuthUser(userProfile);

    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  }

  /**
   * Password Management
   */

  async resetPassword(request: PasswordResetRequest): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`🔑 Password reset requested for: ${request.email}`);

      const { error } = await this.supabaseClient.auth.resetPasswordForEmail(request.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`
      });

      if (error) {
        console.error('Password reset failed:', error.message);
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      // Log access
      await validationService.logAccess('password_reset_request', 'authentication');

      console.log(`✅ Password reset email sent to: ${request.email}`);
      return { success: true };

    } catch (error) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: 'Password reset service unavailable'
      };
    }
  }

  async updatePassword(request: PasswordUpdateRequest): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔐 Password update requested');

      const { error } = await this.supabaseClient.auth.updateUser({
        password: request.newPassword
      });

      if (error) {
        console.error('Password update failed:', error.message);
        return {
          success: false,
          error: this.formatAuthError(error.message)
        };
      }

      // Log access
      const user = await this.getCurrentUser();
      await validationService.logAccess('password_update', 'authentication', user?.id);

      console.log('✅ Password updated successfully');
      return { success: true };

    } catch (error) {
      console.error('Password update error:', error);
      return {
        success: false,
        error: 'Password update failed'
      };
    }
  }

  /**
   * Role and Permission Management
   */

  async updateUserRole(userId: string, newRole: UserRole, adminUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check admin permissions
      const adminUser = await this.getUserProfile(adminUserId);
      if (!adminUser || !this.getPermissionsForRole(adminUser.role).canManageUsers) {
        return {
          success: false,
          error: 'Insufficient permissions to update user roles'
        };
      }

      // Update user role
      const { error } = await this.supabaseClient
        .from('user_profiles')
        .update({
          role: newRole,
          permissions: this.getPermissionsForRole(newRole),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Role update failed:', error.message);
        return {
          success: false,
          error: 'Failed to update user role'
        };
      }

      // Log access
      await validationService.logAccess('role_update', 'user_management', userId);

      console.log(`✅ User role updated: ${userId} -> ${newRole}`);
      return { success: true };

    } catch (error) {
      console.error('Role update error:', error);
      return {
        success: false,
        error: 'Role update service unavailable'
      };
    }
  }

  async deactivateUser(userId: string, adminUserId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check admin permissions
      const adminUser = await this.getUserProfile(adminUserId);
      if (!adminUser || !this.getPermissionsForRole(adminUser.role).canManageUsers) {
        return {
          success: false,
          error: 'Insufficient permissions to deactivate users'
        };
      }

      // Deactivate user
      const { error } = await this.supabaseClient
        .from('user_profiles')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('User deactivation failed:', error.message);
        return {
          success: false,
          error: 'Failed to deactivate user'
        };
      }

      // Log access
      await validationService.logAccess('user_deactivation', 'user_management', userId);

      console.log(`✅ User deactivated: ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('User deactivation error:', error);
      return {
        success: false,
        error: 'User deactivation service unavailable'
      };
    }
  }

  /**
   * Authorization Methods
   */

  hasPermission(user: AuthUser | null, permission: keyof UserPermissions): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    return user.permissions[permission] === true;
  }

  requirePermission(user: AuthUser | null, permission: keyof UserPermissions): void {
    if (!this.hasPermission(user, permission)) {
      throw new Error(`Insufficient permissions: ${permission} required`);
    }
  }

  canAccessResource(user: AuthUser | null, resourceType: string, _resourceOwner?: string): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    // Super admin can access everything
    if (user.role === 'super_admin') {
      return true;
    }

    // Resource-specific access control
    switch (resourceType) {
      case 'validation_session':
        return user.permissions.canRunAnalysis;

      case 'raw_data':
        return user.permissions.canAccessRawData;

      case 'user_management':
        return user.permissions.canManageUsers;

      case 'system_config':
        return user.permissions.canManageSystemConfig;

      case 'audit_trail':
        return user.permissions.canViewAuditTrails;

      default:
        return user.permissions.canViewData;
    }
  }

  /**
   * Helper Methods
   */

  private async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to get user profile:', error.message);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  }

  private async createUserProfile(userId: string, profileData: {
    email: string;
    fullName?: string;
    role: UserRole;
    department?: string;
  }): Promise<void> {
    const { error } = await this.supabaseClient
      .from('user_profiles')
      .insert({
        id: userId,
        email: profileData.email,
        full_name: profileData.fullName,
        role: profileData.role,
        department: profileData.department,
        permissions: this.getPermissionsForRole(profileData.role),
        is_active: true
      });

    if (error) {
      console.error('Failed to create user profile:', error.message);
      throw new Error('Failed to create user profile');
    }
  }

  private async updateLastLogin(userId: string): Promise<void> {
    try {
      await this.supabaseClient
        .from('user_profiles')
        .update({
          last_login_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to update last login:', error);
      // Don't throw - this is non-critical
    }
  }

  private mapToAuthUser(profile: UserProfile): AuthUser {
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name || undefined,
      role: profile.role || 'viewer',
      department: profile.department || undefined,
      permissions: this.getPermissionsForRole(profile.role || 'viewer'),
      isActive: profile.is_active !== false,
      lastLogin: profile.last_login_at || undefined
    };
  }

  private getPermissionsForRole(role: UserRole): UserPermissions {
    const basePermissions: UserPermissions = {
      canViewData: false,
      canExportData: false,
      canViewSensitiveMetrics: false,
      canRunAnalysis: false,
      canCreateValidationSessions: false,
      canViewAuditTrails: false,
      canManageUsers: false,
      canManageSystemConfig: false,
      canAccessRawData: false,
      canDeleteData: false,
      canModifyCalculations: false,
      canOverrideValidation: false,
      canManageBackups: false
    };

    switch (role) {
      case 'viewer':
        return {
          ...basePermissions,
          canViewData: true
        };

      case 'analyst':
        return {
          ...basePermissions,
          canViewData: true,
          canExportData: true,
          canViewSensitiveMetrics: true,
          canRunAnalysis: true,
          canCreateValidationSessions: true,
          canViewAuditTrails: true
        };

      case 'admin':
        return {
          ...basePermissions,
          canViewData: true,
          canExportData: true,
          canViewSensitiveMetrics: true,
          canRunAnalysis: true,
          canCreateValidationSessions: true,
          canViewAuditTrails: true,
          canManageUsers: true,
          canManageSystemConfig: true,
          canAccessRawData: true,
          canModifyCalculations: true
        };

      case 'super_admin':
        return {
          canViewData: true,
          canExportData: true,
          canViewSensitiveMetrics: true,
          canRunAnalysis: true,
          canCreateValidationSessions: true,
          canViewAuditTrails: true,
          canManageUsers: true,
          canManageSystemConfig: true,
          canAccessRawData: true,
          canDeleteData: true,
          canModifyCalculations: true,
          canOverrideValidation: true,
          canManageBackups: true
        };

      default:
        return basePermissions;
    }
  }

  private formatAuthError(errorMessage: string): string {
    // Map Supabase error messages to user-friendly messages
    const errorMap: Record<string, string> = {
      'Invalid login credentials': 'Invalid email or password',
      'Email not confirmed': 'Please check your email and click the confirmation link',
      'User not found': 'Account not found',
      'Weak password': 'Password must be at least 8 characters',
      'Email already registered': 'An account with this email already exists',
      'Signup disabled': 'New registrations are currently disabled'
    };

    return errorMap[errorMessage] || 'Authentication error occurred';
  }
}

/**
 * Singleton authentication service instance
 */
export const authService = new AuthenticationService();

/**
 * Utility functions for authentication checks
 */

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user || !user.isActive) {
    throw new Error('Authentication required');
  }
  return user;
}

export function requireRole(user: AuthUser | null, requiredRole: UserRole): AuthUser {
  const authUser = requireAuth(user);

  const roleHierarchy: Record<UserRole, number> = {
    'viewer': 1,
    'analyst': 2,
    'admin': 3,
    'super_admin': 4
  };

  if (roleHierarchy[authUser.role] < roleHierarchy[requiredRole]) {
    throw new Error(`Insufficient permissions: ${requiredRole} role required`);
  }

  return authUser;
}

export function requirePermission(user: AuthUser | null, permission: keyof UserPermissions): AuthUser {
  const authUser = requireAuth(user);
  authService.requirePermission(authUser, permission);
  return authUser;
}