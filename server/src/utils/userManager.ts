/**
 * @module Utils.UserManager
 *
 * This module provides user management functionality for the application.
 * It loads user credentials from configuration, maintains the user list,
 * and provides methods for user CRUD operations.
 *
 * The UserManager is implemented as a singleton to provide consistent
 * user management throughout the application.
 */

// Internal dependencies
import { IUser } from "../interfaces";
import config from "../file/config_manager";
import log from "../logger";

/**
 * Manages application users and authentication credentials
 *
 * Handles loading users from configuration, storing credentials securely,
 * and providing user information to authentication handlers.
 */
export class UserManager {
  /** Collection of all registered users */
  private users: IUser[] = [];

  /**
   * Creates a new UserManager instance.
   *
   * Loads initial users from the configuration file during instantiation.
   * Throws an error if no users are defined in configuration.
   */
  constructor() {
    // Load users from configuration
    const users = config.get("Authentication");
    if (!users) {
      throw new Error("No users found in config");
    }

    log.info( `Loading ${Object.keys(users).length} users from configuration`, "UserManager" );

    // Initialize users from configuration
    for (const username in users) {
      const userData = (users as Record<string, any>)[username];
      this.addUser({
        username,
        password: userData.secret,
        role: userData.role,
      });

      log.debug(`Loaded user: ${username} (${userData.role})`, "UserManager");
    }
  }

  /**
   * Adds a new user to the system
   *
   * @param user - User information including username, password hash and role
   */
  public addUser(user: IUser): void {
    // Check if user already exists
    const existing = this.getUser(user.username);

    if (existing) {
      log.warn(
        `Attempted to add duplicate user: ${user.username}`,
        "UserManager"
      );
      return;
    }

    this.users.push(user);
    log.info(`Added new user: ${user.username}`, "UserManager");
  }

  /**
   * Removes a user from the system
   *
   * @param username - Username of the user to remove
   */
  public removeUser(username: string): void {
    const initialCount = this.users.length;
    this.users = this.users.filter((user) => user.username !== username);

    if (this.users.length < initialCount) {
      log.info(`Removed user: ${username}`, "UserManager");
    } else {
      log.warn(
        `Attempted to remove non-existent user: ${username}`,
        "UserManager"
      );
    }
  }

  /**
   * Retrieves a user by username
   *
   * @param username - Username to search for
   * @returns User information or undefined if not found
   */
  public getUser(username: string): IUser | undefined {
    return this.users.find((user) => user.username === username);
  }

  /**
   * Gets a list of all users
   *
   * @returns Array of all registered users
   */
  public getUsers(): IUser[] {
    return this.users;
  }
}

// Create and export a singleton instance of the user manager
const userManager = new UserManager();
export default userManager;
