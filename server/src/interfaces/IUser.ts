/**
 * @module Interfaces.IUser
 *
 * This module defines user-related interfaces and enumerations.
 * It provides structures for user authentication, authorization,
 * and role-based access control within the application.
 *
 * Note: The role-based access control system is currently not implemented
 * or used in the application. It exists as a foundation for future
 * permission management features.
 */

/**
 * Interface representing a user account in the system.
 * Contains authentication information and role designation.
 */
export interface IUser {
  /** Unique username for the user */
  username: string;

  /** Password for authentication (should be stored hashed, not plaintext) */
  password: string;

  /** Role assigned to the user that determines permissions (currently unused) */
  role: UserRole;
}

/**
 * Enumeration of possible user roles in the system.
 * Used for role-based access control and permission management.
 *
 * Note: This role system is currently unused but defined for future implementation.
 */
export enum UserRole {
  /** Administrator role with full system access */
  ADMIN = "admin",

  /** Standard user role with limited permissions */
  USER = "user",
}
