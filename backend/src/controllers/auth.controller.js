const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const generateTokens = (user) => {
  const payload = { id: user.id, role: user.role, email: user.email };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  });
  return { accessToken, refreshToken };
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await query(
      'SELECT * FROM Users WHERE email = @email AND isActive = true',
      { email: email.toLowerCase() }
    );

    if (!result.recordset.length) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { accessToken, refreshToken } = generateTokens(user);

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await query(
      'INSERT INTO RefreshTokens (userId, token, expiresAt) VALUES (@userId, @token, @expiresAt)',
      { userId: user.id, token: refreshToken, expiresAt }
    );

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/auth/refresh
const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokenResult = await query(
      'SELECT * FROM RefreshTokens WHERE token = @token AND expiresAt > NOW()',
      { token: refreshToken }
    );

    if (!tokenResult.recordset.length) {
      return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }

    const userResult = await query('SELECT * FROM Users WHERE id = @id', { id: decoded.id });
    if (!userResult.recordset.length) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = userResult.recordset[0];
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    // Rotate refresh token
    await query('DELETE FROM RefreshTokens WHERE token = @token', { token: refreshToken });
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await query(
      'INSERT INTO RefreshTokens (userId, token, expiresAt) VALUES (@userId, @token, @expiresAt)',
      { userId: user.id, token: newRefreshToken, expiresAt }
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

// POST /api/auth/logout
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await query('DELETE FROM RefreshTokens WHERE token = @token', { token: refreshToken });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// POST /api/auth/change-password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const result = await query('SELECT passwordHash FROM Users WHERE id = @id', { id: userId });
    const user = result.recordset[0];

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE Users SET passwordHash = @hash, updatedAt = NOW() WHERE id = @id',
      { hash: newHash, id: userId }
    );

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, fullName, email, role, avatar, phone, dateOfBirth, gender, address, createdAt FROM Users WHERE id = @id',
      { id: req.user.id }
    );
    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { login, refresh, logout, changePassword, getMe };
