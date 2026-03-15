const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Simple in-memory session storage
const sessions = {};

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Path to messages file
const messagesFile = path.join(__dirname, 'messages.json');

// Initialize messages.json if it doesn't exist
function initializeMessagesFile() {
  try {
    if (!fs.existsSync(messagesFile)) {
      fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
    } else {
      const content = fs.readFileSync(messagesFile, 'utf8');
      JSON.parse(content);
    }
  } catch (error) {
    console.warn('Corrupted messages.json detected, creating new file...');
    fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
  }
}

initializeMessagesFile();

// Auth middleware
function isAuthenticated(req, res, next) {
  const sessionId = req.cookies?.sessionId;
  
  if (sessionId && sessions[sessionId]) {
    return next();
  }
  res.redirect('/dashboard-login');
}

// Cookie parser middleware (simple version)
app.use((req, res, next) => {
  const cookieHeader = req.headers.cookie;
  req.cookies = {};
  
  if (cookieHeader) {
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      req.cookies[name] = decodeURIComponent(value || '');
    });
  }
  
  next();
});

// Set cookie helper
function setCookie(res, name, value, maxAge) {
  res.setHeader('Set-Cookie', `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Max-Age=${maxAge}`);
}

// Get all payment methods
app.get('/api/payment-methods', (req, res) => {
  res.json({
    bkash: process.env.BKASH_NUMBER,
    nagad: process.env.NAGAD_NUMBER,
    bank: process.env.BANK_ACCOUNT,
    bank_holder: process.env.BANK_ACCOUNT_HOLDER,
    bank_address: process.env.BANK_ADDRESS,
    cellfin: process.env.CELLFIN_NUMBER,
    rocket: process.env.ROCKET_NUMBER,
    mkash: process.env.MKASH_NUMBER
  });
});

// Submit message endpoint
app.post('/api/submit-message', (req, res) => {
  try {
    const { name, message } = req.body;

    if (!name || !message) {
      return res.status(400).json({
        success: false,
        error: 'Name and message are required'
      });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Name must be at least 2 characters'
      });
    }

    if (message.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Message must be at least 5 characters'
      });
    }

    let messages = [];
    try {
      const fileContent = fs.readFileSync(messagesFile, 'utf8');
      messages = JSON.parse(fileContent);
    } catch (parseError) {
      messages = [];
      fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
    }

    const newMessage = {
      id: Date.now(),
      name: name.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    messages.push(newMessage);
    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));

    res.json({
      success: true,
      message: 'Eid Mubarak! Your message has been saved.',
      data: newMessage
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error occurred'
    });
  }
});

// Get all messages (API)
app.get('/api/messages', (req, res) => {
  try {
    const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
    res.json({
      success: true,
      count: messages.length,
      messages: messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error reading messages'
    });
  }
});

// DELETE message endpoint (PROTECTED)
app.delete('/api/messages/:id', isAuthenticated, (req, res) => {
  try {
    const messageId = parseInt(req.params.id);
    let messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
    
    const initialLength = messages.length;
    messages = messages.filter(msg => msg.id !== messageId);
    
    if (messages.length === initialLength) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    fs.writeFileSync(messagesFile, JSON.stringify(messages, null, 2));
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({
      success: false,
      error: 'Error deleting message'
    });
  }
});

// Login page
app.get('/dashboard-login', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Dashboard Login</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #0a0e27 0%, #050812 100%);
          color: #e0e8f0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .login-container {
          background: rgba(16, 25, 61, 0.95);
          border: 1px solid rgba(0, 102, 255, 0.2);
          padding: 40px;
          border-radius: 10px;
          width: 100%;
          max-width: 400px;
        }
        h1 {
          color: #00ccff;
          text-align: center;
          margin-bottom: 30px;
          text-shadow: 0 0 10px rgba(0, 204, 255, 0.3);
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          color: #00ccff;
          margin-bottom: 8px;
          font-weight: bold;
        }
        input {
          width: 100%;
          padding: 12px;
          background: rgba(5, 8, 18, 0.6);
          border: 1px solid rgba(0, 102, 255, 0.2);
          color: #e0e8f0;
          border-radius: 5px;
          font-size: 16px;
        }
        input:focus {
          outline: none;
          border-color: #00ccff;
          box-shadow: 0 0 10px rgba(0, 204, 255, 0.2);
        }
        button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #0066ff 0%, #00ccff 100%);
          border: none;
          color: #0a0e27;
          font-weight: bold;
          border-radius: 5px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s;
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 20px rgba(0, 204, 255, 0.3);
        }
        .error {
          color: #ff6b6b;
          margin-top: 15px;
          padding: 10px;
          background: rgba(255, 107, 107, 0.1);
          border-radius: 5px;
          display: none;
        }
        .back-link {
          text-align: center;
          margin-top: 20px;
        }
        .back-link a {
          color: #00ccff;
          text-decoration: none;
        }
        .back-link a:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="login-container">
        <h1>🔐 Dashboard Login</h1>
        <form id="loginForm">
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required autofocus>
          </div>
          <button type="submit">Login</button>
          <div class="error" id="error"></div>
        </form>
        <div class="back-link">
          <a href="/">← Back to Home</a>
        </div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const password = document.getElementById('password').value;
          
          try {
            const response = await fetch('/dashboard-auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password })
            });
            
            const data = await response.json();
            
            if (data.success) {
              window.location.href = '/dashboard';
            } else {
              document.getElementById('error').textContent = '❌ Incorrect password';
              document.getElementById('error').style.display = 'block';
              document.getElementById('password').value = '';
            }
          } catch (error) {
            document.getElementById('error').textContent = '❌ Error occurred';
            document.getElementById('error').style.display = 'block';
          }
        });
      </script>
    </body>
    </html>
  `);
});

// Authentication endpoint
app.post('/dashboard-auth', (req, res) => {
  const { password } = req.body;
  
  if (password === process.env.DASHBOARD_PASSWORD) {
    const sessionId = generateSessionId();
    sessions[sessionId] = {
      authenticated: true,
      createdAt: Date.now()
    };
    
    setCookie(res, 'sessionId', sessionId, 86400); // 24 hours
    
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// Logout endpoint
app.get('/dashboard-logout', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    delete sessions[sessionId];
  }
  
  res.setHeader('Set-Cookie', 'sessionId=; Path=/; HttpOnly; Max-Age=0');
  res.redirect('/dashboard-login');
});

// Dashboard page (PROTECTED)
app.get('/dashboard', isAuthenticated, (req, res) => {
  try {
    const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
    
    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Eid Salami - Messages Dashboard</title>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Arial', sans-serif;
          background: linear-gradient(135deg, #0a0e27 0%, #050812 100%);
          color: #e0e8f0;
          padding: 20px;
          min-height: 100vh;
        }
        .container {
          max-width: 1200px;
          margin: 0 auto;
        }
        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          flex-wrap: wrap;
          gap: 20px;
        }
        h1 {
          color: #00ccff;
          text-shadow: 0 0 10px rgba(0, 204, 255, 0.3);
          flex: 1;
        }
        .header-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .btn {
          padding: 10px 20px;
          border: 1px solid rgba(0, 204, 255, 0.3);
          background: rgba(0, 102, 255, 0.1);
          color: #00ccff;
          border-radius: 5px;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.3s;
          font-size: 14px;
        }
        .btn:hover {
          background: rgba(0, 204, 255, 0.1);
          box-shadow: 0 0 10px rgba(0, 204, 255, 0.2);
        }
        .btn-danger {
          background: rgba(255, 107, 107, 0.1);
          border-color: rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
        }
        .btn-danger:hover {
          background: rgba(255, 107, 107, 0.2);
          box-shadow: 0 0 10px rgba(255, 107, 107, 0.2);
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .stat-box {
          background: rgba(16, 25, 61, 0.8);
          border: 1px solid rgba(0, 102, 255, 0.2);
          padding: 20px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-number {
          font-size: 32px;
          color: #00ccff;
          font-weight: bold;
        }
        .stat-label {
          color: #6b7280;
          margin-top: 10px;
          font-size: 14px;
        }
        .controls {
          background: rgba(16, 25, 61, 0.8);
          border: 1px solid rgba(0, 102, 255, 0.2);
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .control-group {
          display: flex;
          gap: 15px;
          flex-wrap: wrap;
          align-items: center;
        }
        input, select {
          padding: 10px 15px;
          background: rgba(5, 8, 18, 0.6);
          border: 1px solid rgba(0, 102, 255, 0.2);
          color: #e0e8f0;
          border-radius: 5px;
          font-size: 14px;
        }
        input:focus, select:focus {
          outline: none;
          border-color: #00ccff;
        }
        .messages-container {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }
        .message-card {
          background: rgba(16, 25, 61, 0.8);
          border: 1px solid rgba(0, 102, 255, 0.2);
          padding: 20px;
          border-radius: 8px;
          transition: all 0.3s;
          position: relative;
        }
        .message-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 20px rgba(0, 204, 255, 0.2);
        }
        .delete-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: rgba(255, 107, 107, 0.2);
          border: 1px solid rgba(255, 107, 107, 0.3);
          color: #ff6b6b;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.3s;
        }
        .delete-btn:hover {
          background: rgba(255, 107, 107, 0.4);
          box-shadow: 0 0 10px rgba(255, 107, 107, 0.3);
        }
        .message-name {
          color: #00ccff;
          font-weight: bold;
          margin-bottom: 10px;
          font-size: 18px;
          padding-right: 50px;
        }
        .message-text {
          color: #e0e8f0;
          margin-bottom: 15px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .message-time {
          color: #6b7280;
          font-size: 12px;
        }
        .empty-state {
          text-align: center;
          padding: 50px 20px;
          color: #6b7280;
        }
        .export-btn {
          background: linear-gradient(135deg, #00cc00 0%, #00ff00 100%);
          color: #000;
          padding: 10px 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <header>
          <h1>🎉 Eid Salami Dashboard</h1>
          <div class="header-buttons">
            <button class="btn export-btn" onclick="exportCSV()">📥 Export CSV</button>
            <a href="/" class="btn">← Back Home</a>
            <a href="/dashboard-logout" class="btn btn-danger">🔓 Logout</a>
          </div>
        </header>

        <div class="stats">
          <div class="stat-box">
            <div class="stat-number" id="messageCount">${messages.length}</div>
            <div class="stat-label">Total Messages</div>
          </div>
        </div>

        <div class="controls">
          <div class="control-group">
            <input type="text" id="searchInput" placeholder="🔍 Search by name..." onkeyup="filterMessages()">
            <select id="sortSelect" onchange="filterMessages()">
              <option value="newest">📅 Newest First</option>
              <option value="oldest">📅 Oldest First</option>
              <option value="name-asc">A-Z Name</option>
              <option value="name-desc">Z-A Name</option>
            </select>
          </div>
        </div>

        <div class="messages-container" id="messagesContainer">
    `;

    if (messages.length === 0) {
      html += `<div class="empty-state"><p>📭 No messages yet</p></div>`;
    } else {
      messages.forEach(msg => {
        const date = new Date(msg.timestamp).toLocaleString();
        html += `
          <div class="message-card" data-name="${msg.name.toLowerCase()}" data-id="${msg.id}">
            <button class="delete-btn" onclick="deleteMessage(${msg.id})">🗑️ Delete</button>
            <div class="message-name">👤 ${msg.name}</div>
            <div class="message-text">${msg.message}</div>
            <div class="message-time">📅 ${date}</div>
          </div>
        `;
      });
    }

    html += `
        </div>
      </div>

      <script>
        let allMessages = ${JSON.stringify(messages)};

        function filterMessages() {
          const searchTerm = document.getElementById('searchInput').value.toLowerCase();
          const sortBy = document.getElementById('sortSelect').value;
          const container = document.getElementById('messagesContainer');
          
          let filtered = allMessages.filter(msg => 
            msg.name.toLowerCase().includes(searchTerm)
          );

          if (sortBy === 'newest') {
            filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          } else if (sortBy === 'oldest') {
            filtered.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          } else if (sortBy === 'name-asc') {
            filtered.sort((a, b) => a.name.localeCompare(b.name));
          } else if (sortBy === 'name-desc') {
            filtered.sort((a, b) => b.name.localeCompare(a.name));
          }

          container.innerHTML = filtered.map(msg => {
            const date = new Date(msg.timestamp).toLocaleString();
            return \`
              <div class="message-card" data-name="\${msg.name.toLowerCase()}" data-id="\${msg.id}">
                <button class="delete-btn" onclick="deleteMessage(\${msg.id})">🗑️ Delete</button>
                <div class="message-name">👤 \${msg.name}</div>
                <div class="message-text">\${msg.message}</div>
                <div class="message-time">📅 \${date}</div>
              </div>
            \`;
          }).join('');
        }

        async function deleteMessage(messageId) {
          if (confirm('⚠️ Are you sure you want to delete this message?')) {
            try {
              const response = await fetch('/api/messages/' + messageId, {
                method: 'DELETE'
              });
              
              const data = await response.json();
              
              if (data.success) {
                allMessages = allMessages.filter(msg => msg.id !== messageId);
                document.getElementById('messageCount').textContent = allMessages.length;
                filterMessages();
              } else {
                alert('❌ Error deleting message');
              }
            } catch (error) {
              alert('❌ Error deleting message');
            }
          }
        }

        function exportCSV() {
          let csv = 'Name,Message,Timestamp\\n';
          
          allMessages.forEach(msg => {
            const escapedMessage = '"' + msg.message.replace(/"/g, '""') + '"';
            const date = new Date(msg.timestamp).toLocaleString();
            csv += \`"\${msg.name}",\${escapedMessage},"\${date}"\\n\`;
          });

          const blob = new Blob([csv], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'eid-messages-' + new Date().toISOString().split('T')[0] + '.csv';
          a.click();
        }
      </script>
    </body>
    </html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send('<h1>Error loading dashboard</h1>');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log('Eid Salami Portal running on http://localhost:' + PORT);
});