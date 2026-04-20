/**
 * @module PasswordHasher
 *
 * This utility script generates bcrypt password hashes for use in the application.
 * It takes a plaintext password from the command line and outputs the corresponding hash.
 *
 * Usage:
 *   node hash.js <password>
 *
 * Example:
 *   node hash.js mySecurePassword
 *
 * The generated hash can be copied into the application's configuration file
 * for user authentication.
 */

// External dependencies
const bcrypt = require("bcrypt");

// Constants
const SALT_ROUNDS = 10; // Number of rounds for bcrypt hashing (higher = more secure but slower)

/**
 * Main script execution
 */
function main() {
  // Extract password from command line arguments
  const password = process.argv[2];

  // Validate input
  if (!password) {
    console.log(
      "Please provide a password to hash. Usage: node hash.js <password>"
    );
    process.exit(1);
  }

  try {
    // Generate hash with specified salt rounds
    const hash = bcrypt.hashSync(password, SALT_ROUNDS);

    // Output the hash (to be copied to config file)
    console.log(hash);
  } catch (error) {
    console.error("Error generating hash:", error.message);
    process.exit(1);
  }
}

// Execute the script
main();
