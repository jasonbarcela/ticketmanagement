// utils/password.js — bcrypt password hashing for staff accounts
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  if (!storedHash.startsWith('$2')) return false;
  return bcrypt.compare(plainPassword, storedHash);
}

module.exports = { hashPassword, verifyPassword, SALT_ROUNDS };
