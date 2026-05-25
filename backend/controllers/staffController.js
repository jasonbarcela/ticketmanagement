// controllers/staffController.js — Technician account management (admin)
const StaffModel = require('../models/staffModel');
const AppError = require('../utils/AppError');

async function createTechnician(req, res, next) {
  try {
    const { username, full_name, password } = req.body;
    if (!username?.trim() || !full_name?.trim() || !password?.trim()) {
      throw new AppError('Username, full name, and password are required.', 400);
    }
    if (password.length < 4) {
      throw new AppError('Password must be at least 4 characters.', 400);
    }

    const existing = await StaffModel.findByUsername(username);
    if (existing) {
      throw new AppError('Username is already taken. Choose a different username.', 409);
    }

    const createdBy = req.user?.username || 'admin';
    const userId = await StaffModel.createTechnicianAccount({
      username: username.trim().toLowerCase(),
      full_name: full_name.trim(),
      password,
      created_by: createdBy,
    });

    res.status(201).json({
      success: true,
      user: {
        user_id: userId,
        username: username.trim().toLowerCase(),
        full_name: full_name.trim(),
        role: 'technician',
        created_by: createdBy,
      },
      message: `Technician account "${username}" created successfully.`,
    });
  } catch (err) {
    next(err);
  }
}

async function listTechnicians(_req, res, next) {
  try {
    const technicians = await StaffModel.getAllTechnicians();
    res.json(technicians);
  } catch (err) {
    next(err);
  }
}

async function getTechnicianProfile(req, res, next) {
  try {
    const param = (req.params.username || '').trim().toLowerCase();
    if (!param) throw new AppError('Username is required.', 400);

    if (req.user?.role === 'technician' && req.user.username !== param) {
      throw new AppError('You can only view your own profile.', 403);
    }

    const tech = await StaffModel.getTechnicianByUsername(param);
    if (!tech) throw new AppError('Technician not found.', 404);

    const assigned_tickets = await StaffModel.getAssignedTicketsForTechnician(tech);

    res.json({
      user_id: tech.user_id,
      username: tech.username,
      full_name: tech.full_name,
      role: 'technician',
      created_by: tech.created_by,
      created_at: tech.created_at,
      assigned_tickets,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createTechnician,
  listTechnicians,
  getTechnicianProfile,
};
