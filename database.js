// database.js - SQLite database untuk Paduka Chatbot
// Super simple untuk pemula!

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseManager {
  constructor() {
    // Buat database file di folder yang sama
    const dbPath = path.join(__dirname, 'paduka_chatbot.db');
    this.isReady = false;
    
    // Connect ke database
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err);
      } else {
        console.log('✅ Connected to SQLite database');
        this.initializeTables();
      }
    });
  }

  // Buat tables kalau belum ada
  initializeTables() {
    const self = this;
    
    // Use serialize to ensure operations run in order
    this.db.serialize(() => {
      // Table 1: Conversations (simpan semua chat)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS conversations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id TEXT UNIQUE NOT NULL,
          customer_name TEXT,
          customer_email TEXT,
          customer_phone TEXT,
          company_name TEXT,
          messages TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating conversations table:', err);
        } else {
          console.log('✅ Conversations table ready');
        }
      });

      // Table 2: Leads (data customer yang sudah lengkap)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS leads (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT UNIQUE,
          phone TEXT,
          company TEXT,
          business_type TEXT,
          company_size TEXT,
          pain_point TEXT,
          status TEXT DEFAULT 'new',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('Error creating leads table:', err);
        } else {
          console.log('✅ Leads table ready');
          self.isReady = true; // Mark as ready after all tables created
        }
      });
    });
  }

  // Wait until database is ready
  waitUntilReady() {
    return new Promise((resolve) => {
      const checkReady = () => {
        if (this.isReady) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }

  // ========================================
  // FUNCTIONS UNTUK SAVE DATA
  // ========================================

  // Save conversation
  async saveConversation(sessionId, messages, customerData = {}) {
    // Wait until tables are created
    await this.waitUntilReady();
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO conversations 
        (session_id, customer_name, customer_email, customer_phone, company_name, messages)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        sessionId,
        customerData.name || null,
        customerData.email || null,
        customerData.phone || null,
        customerData.company || null,
        JSON.stringify(messages) // Convert array to string
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error saving conversation:', err);
          reject(err);
        } else {
          console.log('✅ Conversation saved');
          resolve(this.lastID);
        }
      });
    });
  }

  // Save lead (customer data lengkap)
  async saveLead(leadData) {
    // Wait until tables are created
    await this.waitUntilReady();
    
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO leads 
        (name, email, phone, company, business_type, company_size, pain_point)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const params = [
        leadData.name,
        leadData.email,
        leadData.phone,
        leadData.company,
        leadData.business_type,
        leadData.company_size,
        leadData.pain_point
      ];

      this.db.run(sql, params, function(err) {
        if (err) {
          console.error('Error saving lead:', err);
          reject(err);
        } else {
          console.log('✅ Lead saved');
          resolve(this.lastID);
        }
      });
    });
  }

  // ========================================
  // FUNCTIONS UNTUK GET DATA
  // ========================================

  // Get conversation by session ID
  getConversation(sessionId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM conversations WHERE session_id = ?';
      
      this.db.get(sql, [sessionId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          if (row && row.messages) {
            row.messages = JSON.parse(row.messages); // Convert string back to array
          }
          resolve(row);
        }
      });
    });
  }

  // Get all leads
  getAllLeads() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM leads ORDER BY created_at DESC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get lead by email
  getLeadByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM leads WHERE email = ?';
      
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // ========================================
  // ANALYTICS FUNCTIONS
  // ========================================

  // Count total conversations
  getTotalConversations() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT COUNT(*) as total FROM conversations';
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
  }

  // Count total leads
  getTotalLeads() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT COUNT(*) as total FROM leads';
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.total);
        }
      });
    });
  }

  // Get recent conversations
  getRecentConversations(limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT session_id, customer_name, customer_email, created_at 
        FROM conversations 
        ORDER BY created_at DESC 
        LIMIT ?
      `;
      
      this.db.all(sql, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  close() {
    this.db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
      } else {
        console.log('Database connection closed');
      }
    });
  }
}

// ========================================
// CARA PAKAI
// ========================================

/*
// Import di file lain:
const DatabaseManager = require('./database');
const db = new DatabaseManager();

// Save conversation:
await db.saveConversation('session123', [
  { type: 'user', content: 'Halo' },
  { type: 'bot', content: 'Hai! Ada yang bisa saya bantu?' }
], {
  name: 'John Doe',
  email: 'john@example.com'
});

// Save lead:
await db.saveLead({
  name: 'John Doe',
  email: 'john@example.com',
  phone: '08123456789',
  company: 'PT ABC',
  business_type: 'Retail',
  company_size: 'Kecil',
  pain_point: 'Manual data entry'
});

// Get data:
const conversation = await db.getConversation('session123');
const leads = await db.getAllLeads();
*/

// Export
module.exports = DatabaseManager;