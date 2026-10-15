const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'helpdesk-360-super-secret-jwt-key-2024';

// Database setup on disk
const DB_PATH = process.env.DB_PATH || path.resolve(process.cwd(), 'helpdesk.db');
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database at', DB_PATH, err);
  } else {
    console.log(`Connected to persistent SQLite database at: ${DB_PATH}`);
  }
});

// Promisified SQLite helpers
const runQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const getQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const allQuery = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Hostile input defense & sanitizer for log safety
const sanitizeInput = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim();
};

// Database Initialization & Seeding
const initDB = async () => {
  try {
    // 1. users table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        department TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);

    // 2. tickets table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_code TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        priority TEXT NOT NULL,
        status TEXT NOT NULL,
        reported_by INTEGER NOT NULL,
        assigned_to INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY(reported_by) REFERENCES users(id),
        FOREIGN KEY(assigned_to) REFERENCES users(id)
      )
    `);

    // 3. status_history table
    await runQuery(`
      CREATE TABLE IF NOT EXISTS status_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        old_status TEXT,
        new_status TEXT NOT NULL,
        changed_by INTEGER NOT NULL,
        changed_at TEXT NOT NULL,
        notes TEXT,
        FOREIGN KEY(ticket_id) REFERENCES tickets(id),
        FOREIGN KEY(changed_by) REFERENCES users(id)
      )
    `);

    // Auto-seeding check
    const existingUsers = await getQuery(`SELECT COUNT(*) as count FROM users`);
    if (existingUsers && existingUsers.count === 0) {
      console.log('Seeding initial users and tickets for HelpDesk 360...');
      const defaultHash = await bcrypt.hash('password123', 10);
      const now = new Date().toISOString();

      // Seed Users
      const usersToSeed = [
        { username: 'priya.nair', name: 'Priya Nair', department: 'DevOps Engineering', role: 'employee' },
        { username: 'arjun.mehta', name: 'Arjun Mehta', department: 'Tier 2 Support', role: 'technician' },
        { username: 'elena.rostova', name: 'Elena Rostova', department: 'DevOps Systems', role: 'technician' },
        { username: 'david.chen', name: 'David Chen', department: 'SecOps & IAM', role: 'technician' },
        { username: 'marcus.vance', name: 'Marcus Vance', department: 'Tier 2 Hardware', role: 'technician' },
        { username: 'sarah.jenkins', name: 'Sarah Jenkins', department: 'IT Helpdesk', role: 'technician' },
        { username: 'sarah.lin', name: 'Sarah Lin', department: 'VP Finance • NYC-HQ', role: 'employee' },
        { username: 'liam.oconnor', name: 'Liam O\'Connor', department: 'Enterprise Sales • LDN', role: 'employee' },
        { username: 'kenji.sato', name: 'Kenji Sato', department: 'People Operations', role: 'employee' }
      ];

      for (const u of usersToSeed) {
        await runQuery(
          `INSERT INTO users (username, name, department, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
          [u.username, u.name, u.department, defaultHash, u.role, now]
        );
      }

      const priya = await getQuery(`SELECT id FROM users WHERE username = 'priya.nair'`);
      const arjun = await getQuery(`SELECT id FROM users WHERE username = 'arjun.mehta'`);
      const elena = await getQuery(`SELECT id FROM users WHERE username = 'elena.rostova'`);
      const david = await getQuery(`SELECT id FROM users WHERE username = 'david.chen'`);
      const marcus = await getQuery(`SELECT id FROM users WHERE username = 'marcus.vance'`);
      const sarahTech = await getQuery(`SELECT id FROM users WHERE username = 'sarah.jenkins'`);
      const sarahFin = await getQuery(`SELECT id FROM users WHERE username = 'sarah.lin'`);
      const liam = await getQuery(`SELECT id FROM users WHERE username = 'liam.oconnor'`);
      const kenji = await getQuery(`SELECT id FROM users WHERE username = 'kenji.sato'`);

      // Seed Initial Sample Tickets
      const sampleTickets = [
        {
          ticket_code: 'HD-8950',
          title: 'Core ERP Payroll Database connectivity timeout (Postgres 504)',
          description: 'Database cluster 03 connection timed out repeatedly during morning batch payroll export. Needs urgent DBA triage.',
          category: 'software',
          priority: 'urgent',
          status: 'open',
          reported_by: sarahFin ? sarahFin.id : priya.id,
          assigned_to: null,
          created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'HD-8942',
          title: 'MacBook Pro external display flickering via USB-C dock',
          description: 'Screen blanks every 45 seconds when plugged into Dell 4K Hub / CalDigit TS4 dock with M3 Max laptop.',
          category: 'hardware',
          priority: 'urgent',
          status: 'in-progress',
          reported_by: priya.id,
          assigned_to: marcus ? marcus.id : arjun.id,
          created_at: new Date(Date.now() - 48 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'HD-8935',
          title: 'VPN Gateway handshake failure on London branch proxy',
          description: 'Receiving IPsec handshake timeout when accessing us-east-2 subnet from London office proxy gateway.',
          category: 'network',
          priority: 'high',
          status: 'open',
          reported_by: liam ? liam.id : priya.id,
          assigned_to: elena ? elena.id : arjun.id,
          created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 75 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'HD-8819',
          title: 'Staging Kubernetes cluster VPN tunnel failure',
          description: 'Receiving IPsec handshake timeout when accessing us-east-2 subnet staging pods.',
          category: 'network',
          priority: 'high',
          status: 'open',
          reported_by: priya.id,
          assigned_to: null,
          created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'HD-8730',
          title: 'Datadog APM enterprise seats & Okta role mapping',
          description: 'Approved by Engineering Lead. Need log ingest permissions and APM seat provisioning.',
          category: 'account-access',
          priority: 'medium',
          status: 'resolved',
          reported_by: priya.id,
          assigned_to: elena ? elena.id : arjun.id,
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'HD-8920',
          title: 'Figma Enterprise seat upgrade and license reassignment',
          description: 'Product design organization seat request for sprint prototyping.',
          category: 'account-access',
          priority: 'medium',
          status: 'in-progress',
          reported_by: priya.id,
          assigned_to: david ? david.id : arjun.id,
          created_at: new Date(Date.now() - 160 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        },
        {
          ticket_code: 'HD-8912',
          title: 'Request replacement ergonomic wireless mouse (Logitech MX3)',
          description: 'Asset Peripheral #PER-088 scroll wheel defective after 3 years of use.',
          category: 'hardware',
          priority: 'low',
          status: 'resolved',
          reported_by: kenji ? kenji.id : priya.id,
          assigned_to: sarahTech ? sarahTech.id : arjun.id,
          created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        }
      ];

      for (const t of sampleTickets) {
        const result = await runQuery(
          `INSERT INTO tickets (ticket_code, title, description, category, priority, status, reported_by, assigned_to, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.ticket_code, t.title, t.description, t.category, t.priority, t.status, t.reported_by, t.assigned_to, t.created_at, t.updated_at]
        );

        await runQuery(
          `INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at, notes)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [result.lastID, null, 'open', t.reported_by, t.created_at, 'Ticket opened by user']
        );

        if (t.status !== 'open') {
          await runQuery(
            `INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [result.lastID, 'open', t.status, t.assigned_to || arjun.id, t.updated_at, 'Status transition in triage']
          );
        }
      }
      console.log('Seeding completed successfully!');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
};

initDB();

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired authentication token' });
    }
    req.user = user;
    next();
  });
};

const requireTechnician = (req, res, next) => {
  if (req.user.role !== 'technician') {
    return res.status(403).json({ error: 'Access denied: Technician role required' });
  }
  next();
};

// Validation constants
const VALID_CATEGORIES = ['hardware', 'network', 'software', 'account-access'];
const VALID_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const VALID_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

// Strict Enterprise Status Transition State Machine (Part 6.5)
const ALLOWED_STATUS_TRANSITIONS = {
  'open': ['in-progress', 'closed'],
  'in-progress': ['resolved', 'open'],
  'resolved': ['closed', 'in-progress'],
  'closed': ['open']
};

// ==========================================
// ROUTES
// ==========================================

// 1. POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = sanitizeInput(username).toLowerCase();
    const user = await getQuery(`SELECT * FROM users WHERE LOWER(username) = ?`, [cleanUsername]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        department: user.department,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
});

// GET /api/auth/me (Current user info)
app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await getQuery(`SELECT id, username, name, department, role FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

// 2. GET /api/tickets
// Role-restricted: Employee gets own; Tech gets all, urgent first, with filter params
app.get('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const { status, priority, category, search, technician_id, my_tickets } = req.query;
    const isTech = req.user.role === 'technician';

    let query = `
      SELECT 
        t.id,
        t.ticket_code,
        t.title,
        t.description,
        t.category,
        t.priority,
        t.status,
        t.reported_by,
        t.assigned_to,
        t.created_at,
        t.updated_at,
        u_rep.name as reporter_name,
        u_rep.username as reporter_username,
        u_rep.department as reporter_department,
        u_ass.name as assignee_name,
        u_ass.username as assignee_username,
        u_ass.department as assignee_department
      FROM tickets t
      LEFT JOIN users u_rep ON t.reported_by = u_rep.id
      LEFT JOIN users u_ass ON t.assigned_to = u_ass.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC: Employee CAN ONLY see their own tickets
    if (!isTech) {
      query += ` AND t.reported_by = ?`;
      params.push(req.user.id);
    } else {
      // Tech can filter by "my tickets"
      if (my_tickets === 'true') {
        query += ` AND t.assigned_to = ?`;
        params.push(req.user.id);
      } else if (technician_id) {
        if (technician_id === 'unassigned') {
          query += ` AND t.assigned_to IS NULL`;
        } else {
          query += ` AND t.assigned_to = ?`;
          params.push(parseInt(technician_id, 10));
        }
      }
    }

    // Status filter
    if (status && status !== 'ALL' && status !== 'Status: All') {
      query += ` AND LOWER(t.status) = ?`;
      params.push(status.toLowerCase());
    }

    // Priority filter
    if (priority && priority !== 'ALL' && priority !== 'Priority: All') {
      query += ` AND LOWER(t.priority) = ?`;
      params.push(priority.toLowerCase());
    }

    // Category filter
    if (category && category !== 'ALL' && category !== 'Category: All') {
      query += ` AND LOWER(t.category) = ?`;
      params.push(category.toLowerCase());
    }

    // Search filter
    if (search && search.trim() !== '') {
      const term = `%${search.trim().toLowerCase()}%`;
      query += ` AND (
        LOWER(t.ticket_code) LIKE ? OR
        LOWER(t.title) LIKE ? OR
        LOWER(t.description) LIKE ? OR
        LOWER(u_rep.name) LIKE ?
      )`;
      params.push(term, term, term, term);
    }

    // Ordering: Urgent tickets sorted first for tech view, then newest first
    if (isTech) {
      query += ` ORDER BY CASE WHEN LOWER(t.priority) = 'urgent' THEN 0 ELSE 1 END, datetime(t.created_at) DESC`;
    } else {
      query += ` ORDER BY datetime(t.created_at) DESC`;
    }

    const tickets = await allQuery(query, params);
    res.json({ tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to query tickets database' });
  }
});

// 2b. GET /api/tickets/:id
// IDOR & Route Security Defenses (Part 6.7)
// Employee can only access tickets they reported; Technicians can access any ticket
app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    if (isNaN(ticketId)) {
      return res.status(400).json({ error: 'Invalid ticket ID' });
    }

    const ticket = await getQuery(
      `SELECT t.*, 
              u_rep.name as reporter_name, u_rep.username as reporter_username, u_rep.department as reporter_department,
              u_ass.name as assignee_name, u_ass.username as assignee_username, u_ass.department as assignee_department
       FROM tickets t
       LEFT JOIN users u_rep ON t.reported_by = u_rep.id
       LEFT JOIN users u_ass ON t.assigned_to = u_ass.id
       WHERE t.id = ?`,
      [ticketId]
    );

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // IDOR Protection: Employees are restricted strictly to their own tickets
    if (req.user.role === 'employee' && ticket.reported_by !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You do not have permission to view this ticket' });
    }

    res.json({ ticket });
  } catch (error) {
    console.error('Error fetching ticket by ID:', error);
    res.status(500).json({ error: 'Failed to retrieve ticket from database' });
  }
});

// 3. POST /api/tickets
// Creates ticket and initial status_history row
app.post('/api/tickets', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, priority } = req.body;

    const cleanTitle = sanitizeInput(title);
    const cleanDesc = sanitizeInput(description);
    const cleanCat = sanitizeInput(category).toLowerCase();
    const cleanPriority = sanitizeInput(priority).toLowerCase();

    // Validations
    if (!cleanTitle) {
      return res.status(400).json({ error: 'Issue summary (title) is required' });
    }
    if (cleanTitle.length > 80) {
      return res.status(400).json({ error: 'Title cannot exceed 80 characters' });
    }

    if (!cleanDesc) {
      return res.status(400).json({ error: 'Description is required' });
    }
    if (cleanDesc.length > 5000) {
      return res.status(400).json({ error: 'Description cannot exceed 5000 characters' });
    }

    if (!VALID_CATEGORIES.includes(cleanCat)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`
      });
    }

    if (!VALID_PRIORITIES.includes(cleanPriority)) {
      return res.status(400).json({
        error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`
      });
    }

    // Generate unique ticket code: HD-XXXX
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const ticketCode = `HD-${randomNum}`;
    const now = new Date().toISOString();

    // Persistent INSERT into SQLite
    const insertResult = await runQuery(
      `INSERT INTO tickets (ticket_code, title, description, category, priority, status, reported_by, assigned_to, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'open', ?, NULL, ?, ?)`,
      [ticketCode, cleanTitle, cleanDesc, cleanCat, cleanPriority, req.user.id, now, now]
    );

    const ticketId = insertResult.lastID;

    // Insert initial status_history
    await runQuery(
      `INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at, notes)
       VALUES (?, NULL, 'open', ?, ?, 'Ticket created by user')`,
      [ticketId, req.user.id, now]
    );

    const createdTicket = await getQuery(
      `SELECT t.*, u.name as reporter_name, u.department as reporter_department
       FROM tickets t
       LEFT JOIN users u ON t.reported_by = u.id
       WHERE t.id = ?`,
      [ticketId]
    );

    res.status(201).json({
      message: 'Ticket created successfully',
      ticket: createdTicket
    });
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Failed to commit ticket to database' });
  }
});

// 4. PATCH /api/tickets/:id/status
// Tech only: updates status with strict state machine, logs to status_history
app.patch('/api/tickets/:id/status', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { status } = req.body;
    const cleanStatus = sanitizeInput(status).toLowerCase();

    if (!VALID_STATUSES.includes(cleanStatus)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
      });
    }

    const currentTicket = await getQuery(`SELECT * FROM tickets WHERE id = ?`, [ticketId]);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // SERVER-SIDE STATUS TRANSITION STATE MACHINE (Part 6.5)
    // open -> can only transition to in-progress or closed
    // in-progress -> can only transition to resolved or open
    // resolved -> can only transition to closed or in-progress
    // closed -> can only transition to open (reopening)
    if (cleanStatus !== currentTicket.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentTicket.status] || [];
      if (!allowedNext.includes(cleanStatus)) {
        return res.status(400).json({
          error: `Invalid status transition: Cannot transition ticket #${ticketId} from '${currentTicket.status}' to '${cleanStatus}'. Allowed transitions: ${allowedNext.join(', ')}`
        });
      }
    }

    const now = new Date().toISOString();
    await runQuery(
      `UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?`,
      [cleanStatus, now, ticketId]
    );

    await runQuery(
      `INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, currentTicket.status, cleanStatus, req.user.id, now, `Status updated to ${cleanStatus}`]
    );

    const updated = await getQuery(
      `SELECT t.*, u_rep.name as reporter_name, u_ass.name as assignee_name
       FROM tickets t
       LEFT JOIN users u_rep ON t.reported_by = u_rep.id
       LEFT JOIN users u_ass ON t.assigned_to = u_ass.id
       WHERE t.id = ?`,
      [ticketId]
    );

    res.json({ message: 'Ticket status updated', ticket: updated });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update ticket status in database' });
  }
});

// 5. PATCH /api/tickets/:id/assign
// Tech only: updates assigned_to with technician role validation
app.patch('/api/tickets/:id/assign', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { assigned_to } = req.body;

    let assigneeId = null;
    if (assigned_to !== null && assigned_to !== undefined && assigned_to !== '' && assigned_to !== 'unassigned') {
      assigneeId = parseInt(assigned_to, 10);
      if (isNaN(assigneeId)) {
        return res.status(400).json({ error: 'Invalid technician ID' });
      }
      const techUser = await getQuery(`SELECT id, role FROM users WHERE id = ?`, [assigneeId]);
      if (!techUser) {
        return res.status(400).json({ error: 'Target assignee user does not exist' });
      }
      if (techUser.role !== 'technician') {
        return res.status(400).json({ error: 'Assigned user must be a registered technician' });
      }
    }

    const currentTicket = await getQuery(`SELECT * FROM tickets WHERE id = ?`, [ticketId]);
    if (!currentTicket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const now = new Date().toISOString();
    await runQuery(
      `UPDATE tickets SET assigned_to = ?, updated_at = ? WHERE id = ?`,
      [assigneeId, now, ticketId]
    );

    const updated = await getQuery(
      `SELECT t.*, u_rep.name as reporter_name, u_ass.name as assignee_name
       FROM tickets t
       LEFT JOIN users u_rep ON t.reported_by = u_rep.id
       LEFT JOIN users u_ass ON t.assigned_to = u_ass.id
       WHERE t.id = ?`,
      [ticketId]
    );

    res.json({ message: 'Ticket assignee updated', ticket: updated });
  } catch (error) {
    console.error('Error updating ticket assignee:', error);
    res.status(500).json({ error: 'Failed to update ticket assignee in database' });
  }
});

// 6. POST /api/tickets/batch (Tech only: Batch update status and/or assignees)
app.post('/api/tickets/batch', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const { updates } = req.body; // Array of { id, status?, assigned_to? }
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates array is required' });
    }

    const now = new Date().toISOString();
    let updatedCount = 0;

    for (const item of updates) {
      const ticketId = parseInt(item.id, 10);
      const ticket = await getQuery(`SELECT * FROM tickets WHERE id = ?`, [ticketId]);
      if (!ticket) continue;

      let newStatus = ticket.status;
      let newAssignee = ticket.assigned_to;

      if (item.status && VALID_STATUSES.includes(item.status.toLowerCase())) {
        const targetStatus = item.status.toLowerCase();
        if (targetStatus !== ticket.status) {
          const allowed = ALLOWED_STATUS_TRANSITIONS[ticket.status] || [];
          if (allowed.includes(targetStatus)) {
            newStatus = targetStatus;
            await runQuery(
              `INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at, notes)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [ticketId, ticket.status, newStatus, req.user.id, now, 'Batch update']
            );
          }
        }
      }

      if (item.assigned_to !== undefined) {
        if (item.assigned_to === null || item.assigned_to === 'unassigned' || item.assigned_to === '') {
          newAssignee = null;
        } else {
          const techId = parseInt(item.assigned_to, 10);
          const tech = await getQuery(`SELECT id, role FROM users WHERE id = ?`, [techId]);
          if (tech && tech.role === 'technician') {
            newAssignee = techId;
          }
        }
      }

      await runQuery(
        `UPDATE tickets SET status = ?, assigned_to = ?, updated_at = ? WHERE id = ?`,
        [newStatus, newAssignee, now, ticketId]
      );
      updatedCount++;
    }

    res.json({ message: `Successfully committed ${updatedCount} ticket updates`, count: updatedCount });
  } catch (error) {
    console.error('Batch update error:', error);
    res.status(500).json({ error: 'Failed to process batch updates' });
  }
});

// 7. GET /api/dashboard/stats
// Tech only: direct SQL aggregate counts against helpdesk.db
app.get('/api/dashboard/stats', authenticateToken, requireTechnician, async (req, res) => {
  try {
    // 1. Open Issues: SELECT COUNT(*) FROM tickets WHERE status = 'open'
    const openRes = await getQuery(
      `SELECT COUNT(*) as count FROM tickets WHERE status = 'open'`
    );

    // 2. Urgent Requests: SELECT COUNT(*) FROM tickets WHERE priority = 'urgent' AND status != 'closed'
    const urgentRes = await getQuery(
      `SELECT COUNT(*) as count FROM tickets WHERE LOWER(priority) = 'urgent' AND status != 'closed'`
    );

    // 3. Active Technicians: SELECT COUNT(DISTINCT assigned_to) FROM tickets WHERE assigned_to IS NOT NULL AND status IN ('open', 'in-progress')
    const activeTechsRes = await getQuery(
      `SELECT COUNT(DISTINCT assigned_to) as count FROM tickets WHERE assigned_to IS NOT NULL AND status IN ('open', 'in-progress')`
    );

    // Total technicians on shift
    const totalTechsRes = await getQuery(
      `SELECT COUNT(*) as count FROM users WHERE role = 'technician'`
    );

    // 4. Completed Work: SELECT COUNT(*) FROM tickets WHERE status IN ('resolved', 'closed')
    const completedRes = await getQuery(
      `SELECT COUNT(*) as count FROM tickets WHERE status IN ('resolved', 'closed')`
    );

    const totalTicketsRes = await getQuery(`SELECT COUNT(*) as count FROM tickets`);

    res.json({
      open_issues: openRes ? openRes.count : 0,
      urgent_requests: urgentRes ? urgentRes.count : 0,
      active_technicians: activeTechsRes ? activeTechsRes.count : 0,
      total_technicians: totalTechsRes ? totalTechsRes.count : 0,
      completed_work: completedRes ? completedRes.count : 0,
      total_tickets: totalTicketsRes ? totalTicketsRes.count : 0
    });
  } catch (error) {
    console.error('Error computing dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to compute dashboard metrics from database' });
  }
});

// 8. GET /api/technicians
// Tech only: returns list of technicians for dropdowns
app.get('/api/technicians', authenticateToken, requireTechnician, async (req, res) => {
  try {
    const technicians = await allQuery(
      `SELECT id, username, name, department, role FROM users WHERE role = 'technician' ORDER BY name ASC`
    );
    res.json({ technicians });
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to retrieve technicians list' });
  }
});

// 9. GET /api/tickets/:id/history
// Returns audit trail for ticket
app.get('/api/tickets/:id/history', authenticateToken, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const ticket = await getQuery(`SELECT id, reported_by FROM tickets WHERE id = ?`, [ticketId]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Role check: employee can only see history of their own ticket
    if (req.user.role === 'employee' && ticket.reported_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const history = await allQuery(
      `SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
       FROM status_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.ticket_id = ?
       ORDER BY datetime(h.changed_at) ASC`,
      [ticketId]
    );

    res.json({ history });
  } catch (error) {
    console.error('Error fetching ticket history:', error);
    res.status(500).json({ error: 'Failed to fetch ticket history' });
  }
});

// 10. POST /api/tickets/:id/notes
// Adds note or update into status_history
app.post('/api/tickets/:id/notes', authenticateToken, async (req, res) => {
  try {
    const ticketId = parseInt(req.params.id, 10);
    const { note } = req.body;
    const cleanNote = sanitizeInput(note);
    if (!cleanNote) {
      return res.status(400).json({ error: 'Note content cannot be empty' });
    }

    const ticket = await getQuery(`SELECT id, status, reported_by FROM tickets WHERE id = ?`, [ticketId]);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    if (req.user.role === 'employee' && ticket.reported_by !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const now = new Date().toISOString();
    await runQuery(
      `INSERT INTO status_history (ticket_id, old_status, new_status, changed_by, changed_at, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ticketId, ticket.status, ticket.status, req.user.id, now, cleanNote]
    );

    const history = await allQuery(
      `SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
       FROM status_history h
       LEFT JOIN users u ON h.changed_by = u.id
       WHERE h.ticket_id = ?
       ORDER BY datetime(h.changed_at) ASC`,
      [ticketId]
    );

    res.json({ message: 'Activity note added', history });
  } catch (error) {
    console.error('Error recording ticket note:', error);
    res.status(500).json({ error: 'Failed to record activity note' });
  }
});

// Start listening if run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`HelpDesk 360 backend server listening on port ${PORT}`);
  });
}

module.exports = { app, db };
