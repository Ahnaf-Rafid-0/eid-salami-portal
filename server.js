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

// Path to messages file
const messagesFile = path.join(__dirname, 'messages.json');

// Initialize messages.json if it doesn't exist
if (!fs.existsSync(messagesFile)) {
  fs.writeFileSync(messagesFile, JSON.stringify([], null, 2));
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

    // Validation
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

    // Read existing messages
    const messages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));

    // Add new message
    const newMessage = {
      id: Date.now(),
      name: name.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    messages.push(newMessage);

    // Save to file
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

// Get all messages
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running!' });
});

// Start server
app.listen(PORT, () => {
  console.log('Eid Salami Portal running on http://localhost:' + PORT);
});
