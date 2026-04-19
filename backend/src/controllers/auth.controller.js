const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { query } = require("../config/database");
const { asyncHandler } = require("../utils/asyncHandler");
const { createHttpError } = require("../utils/httpError");

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  });
  return { accessToken, refreshToken };
};

const createRefreshExpiry = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  return expiresAt;
};

const sanitizeUser = (user) => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  role: user.role,
  avatar: user.avatar,
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw createHttpError(400, "Email and password are required");
  }

  const result = await query(
    "SELECT * FROM Users WHERE email = @email AND isActive = true",
    { email: email.toLowerCase() },
  );

  if (!result.recordset.length) {
    throw createHttpError(401, "Invalid email or password");
  }

  const user = result.recordset[0];
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw createHttpError(401, "Invalid email or password");
  }

  const { accessToken, refreshToken } = generateTokens(user);

  await query(
    "INSERT INTO RefreshTokens (userId, token, expiresAt) VALUES (@userId, @token, @expiresAt)",
    { userId: user.id, token: refreshToken, expiresAt: createRefreshExpiry() },
  );

  res.json({
    accessToken,
    refreshToken,
    user: sanitizeUser(user),
  });
});

// POST /api/auth/refresh
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw createHttpError(401, "Refresh token required");
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch (err) {
    throw createHttpError(401, "Invalid refresh token");
  }

  const tokenResult = await query(
    "SELECT * FROM RefreshTokens WHERE token = @token AND expiresAt > NOW()",
    { token: refreshToken },
  );

  if (!tokenResult.recordset.length) {
    throw createHttpError(401, "Invalid or expired refresh token");
  }

  const userResult = await query("SELECT * FROM Users WHERE id = @id", {
    id: decoded.id,
  });
  if (!userResult.recordset.length) {
    throw createHttpError(401, "User not found");
  }

  const user = userResult.recordset[0];
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  await query("DELETE FROM RefreshTokens WHERE token = @token", {
    token: refreshToken,
  });
  await query(
    "INSERT INTO RefreshTokens (userId, token, expiresAt) VALUES (@userId, @token, @expiresAt)",
    {
      userId: user.id,
      token: newRefreshToken,
      expiresAt: createRefreshExpiry(),
    },
  );

  res.json({ accessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await query("DELETE FROM RefreshTokens WHERE token = @token", {
      token: refreshToken,
    });
  }
  res.json({ message: "Logged out successfully" });
});

// POST /api/auth/change-password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  const result = await query("SELECT passwordHash FROM Users WHERE id = @id", {
    id: userId,
  });
  if (!result.recordset.length) {
    throw createHttpError(404, "User not found");
  }

  const user = result.recordset[0];
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw createHttpError(400, "Current password is incorrect");
  }

  if (newPassword.length < 8) {
    throw createHttpError(400, "New password must be at least 8 characters");
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await query(
    "UPDATE Users SET passwordHash = @hash, updatedAt = NOW() WHERE id = @id",
    { hash: newHash, id: userId },
  );

  res.json({ message: "Password changed successfully" });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  const result = await query(
    "SELECT id, fullName, email, role, avatar, phone, dateOfBirth, gender, address, createdAt FROM Users WHERE id = @id",
    { id: req.user.id },
  );
  if (!result.recordset.length) {
    throw createHttpError(404, "User not found");
  }

  res.json(result.recordset[0]);
});

module.exports = { login, refresh, logout, changePassword, getMe };
