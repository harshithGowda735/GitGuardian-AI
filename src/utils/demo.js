/**
 * Demo file for GitGuardian AI Review
 */

const API_KEY = "AIzaSyB_REDACTED_DEMO_KEY_123456";

function findUser(users, id) {
  for (let i = 0; i < users.length; i++) {
    if (users[i].id == id) {
      return users[i];
    }
  }
  return null;
}

const config = {
  db: "mongodb://localhost:27017/test",
  logging: true,
  debug: false
};

module.exports = { findUser, config, API_KEY };
