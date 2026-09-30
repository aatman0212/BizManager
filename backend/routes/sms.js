const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

// Preset SMS Templates
const TEMPLATES = [
  {
    id: 'payment_reminder',
    name: 'Payment Due Reminder',
    category: 'Billing',
    template: 'Dear {customerName}, this is a gentle reminder that you have a pending balance of {currency}{amount} with {businessName}. Please clear it at your earliest convenience. Thank you!'
  },
  {
    id: 'bill_receipt',
    name: 'Invoice / Bill Receipt',
    category: 'Billing',
    template: 'Hello {customerName}, thank you for your purchase at {businessName}! Your Invoice #{invoiceNumber} for {currency}{totalAmount} is confirmed. Paid: {currency}{amountPaid}, Balance: {currency}{balance}. Have a great day!'
  },
  {
    id: 'thank_you',
    name: 'Customer Thank You Note',
    category: 'Relationship',
    template: 'Dear {customerName}, thank you for choosing {businessName}! We deeply value your trust and look forward to serving you again soon.'
  },
  {
    id: 'festival_offer',
    name: 'Special Offer / Discount',
    category: 'Marketing',
    template: 'Special offer for {customerName}! Enjoy exclusive discounts on our latest collection at {businessName}. Visit us or call {businessPhone} today!'
  },
  {
    id: 'custom',
    name: 'Custom Message',
    category: 'General',
    template: '{message}'
  }
];

// GET /api/sms/templates - list available templates
router.get('/templates', (req, res) => {
  res.json(TEMPLATES);
});

// GET /api/sms/logs - get sent SMS history for this business
router.get('/logs', (req, res) => {
  const businessId = req.user.businessId;
  const logs = db.get('smsLogs')
    .filter({ businessId })
    .value() || [];
  
  res.json(logs.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 50));
});

// POST /api/sms/send - send 1-click SMS to a customer
router.post('/send', async (req, res) => {
  const businessId = req.user.businessId;
  const business = db.get('businesses').find({ id: businessId }).value();

  const { customerId, phone, message, templateType, customerName } = req.body;

  if (!phone || !message) {
    return res.status(400).json({ message: 'Phone number and message text are required.' });
  }

  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 10) {
    return res.status(400).json({ message: 'Please provide a valid 10-digit phone number.' });
  }

  const smsConfig = business?.smsConfig || { provider: 'simulator' };
  let status = 'DELIVERED';
  let errorDetail = null;
  let gatewayUsed = smsConfig.provider || 'simulator';

  // Gateway dispatch logic
  if (smsConfig.provider === 'twilio' && smsConfig.twilioSid && smsConfig.twilioAuthToken) {
    try {
      // Direct Twilio REST API call without heavy external library
      const authHeader = 'Basic ' + Buffer.from(`${smsConfig.twilioSid}:${smsConfig.twilioAuthToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`);
      params.append('From', smsConfig.twilioFrom);
      params.append('Body', message);

      const twilioRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${smsConfig.twilioSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        }
      );

      if (!twilioRes.ok) {
        const twErr = await twilioRes.json();
        status = 'FAILED';
        errorDetail = twErr.message || 'Twilio error';
      } else {
        status = 'DELIVERED';
      }
    } catch (err) {
      status = 'FAILED';
      errorDetail = err.message;
    }
  } else if (smsConfig.provider === 'fast2sms' && smsConfig.fast2smsApiKey) {
    try {
      const f2Res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': smsConfig.fast2smsApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'v3',
          sender_id: smsConfig.senderId || 'TXTIND',
          message: message,
          language: 'english',
          flash: 0,
          numbers: cleanPhone
        })
      });
      const f2Data = await f2Res.json();
      if (f2Data.return === true) {
        status = 'DELIVERED';
      } else {
        status = 'FAILED';
        errorDetail = f2Data.message?.[0] || 'Fast2SMS dispatch error';
      }
    } catch (err) {
      status = 'FAILED';
      errorDetail = err.message;
    }
  } else {
    // Simulator Mode (Instant local success with delivery logging)
    status = 'DELIVERED (SIMULATED)';
    gatewayUsed = 'Built-in Instant SMS Simulator';
  }

  const logEntry = {
    id: uuidv4(),
    businessId,
    customerId: customerId || null,
    customerName: customerName || 'Customer',
    phone: cleanPhone,
    message,
    templateType: templateType || 'custom',
    status,
    errorDetail,
    gateway: gatewayUsed,
    date: new Date().toISOString()
  };

  db.get('smsLogs').push(logEntry).write();

  res.status(200).json({
    success: status.includes('DELIVERED'),
    message: status.includes('DELIVERED')
      ? `SMS sent successfully to ${cleanPhone}!`
      : `Failed to send SMS: ${errorDetail}`,
    log: logEntry
  });
});

module.exports = router;
