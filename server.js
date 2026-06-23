require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'src')));

// ─── PostgreSQL (Supabase) Connection ────────────────────────
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ─── Create Tables on Startup ────────────────────────────────
async function initDB() {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS contacts (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                company TEXT,
                email TEXT NOT NULL,
                phone TEXT,
                message TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await db.query(`
            CREATE TABLE IF NOT EXISTS bookings (
                id SERIAL PRIMARY KEY,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT NOT NULL,
                phone TEXT,
                company TEXT,
                role TEXT,
                country TEXT NOT NULL,
                business_stage TEXT,
                services TEXT,
                goals TEXT NOT NULL,
                timeline TEXT,
                referral_source TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        console.log('✅ Database tables ready.');
    } catch (err) {
        console.error('❌ Database init error:', err.message);
    }
}

initDB();

// ─── Email Setup (Nodemailer via Gmail) ──────────────────────
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_FROM,
        pass: process.env.EMAIL_PASSWORD
    }
});

async function sendEmailNotification(subject, htmlBody) {
    if (!process.env.EMAIL_FROM || !process.env.EMAIL_PASSWORD) return;
    try {
        await transporter.sendMail({
            from: `"Stratagem Africa Website" <${process.env.EMAIL_FROM}>`,
            to: process.env.EMAIL_TO,
            subject,
            html: htmlBody
        });
        console.log(`📧 Email notification sent: ${subject}`);
    } catch (err) {
        console.error('❌ Email error:', err.message);
    }
}

// ─── API: Contact Form ────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
    const { name, company, email, phone, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO contacts (name, company, email, phone, message) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
            [name, company, email, phone, message]
        );

        // Send email notification
        await sendEmailNotification(
            `📬 New Contact Form — ${name}`,
            `
            <h2 style="color:#00E599">New Contact Form Submission</h2>
            <table style="border-collapse:collapse;width:100%;font-family:Arial">
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Name</strong></td><td style="padding:8px;border:1px solid #eee">${name}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Email</strong></td><td style="padding:8px;border:1px solid #eee">${email}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #eee">${phone || 'Not provided'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Company</strong></td><td style="padding:8px;border:1px solid #eee">${company || 'Not provided'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Message</strong></td><td style="padding:8px;border:1px solid #eee">${message}</td></tr>
            </table>
            `
        );

        res.status(201).json({ success: true, message: 'Message received!', id: result.rows[0].id });
    } catch (err) {
        console.error('Contact save error:', err.message);
        res.status(500).json({ error: 'Failed to save your message.' });
    }
});

// ─── API: Booking Form ────────────────────────────────────────
app.post('/api/book', async (req, res) => {
    const { firstName, lastName, email, phone, company, role, country, businessStage, services, goals, timeline, referralSource } = req.body;

    if (!firstName || !lastName || !email || !country || !goals) {
        return res.status(400).json({ error: 'First name, last name, email, country, and goals are required.' });
    }

    try {
        const result = await db.query(
            `INSERT INTO bookings (first_name, last_name, email, phone, company, role, country, business_stage, services, goals, timeline, referral_source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
            [firstName, lastName, email, phone, company, role, country, businessStage, services, goals, timeline, referralSource]
        );

        // Send email notification
        await sendEmailNotification(
            `📅 New Consultation Request — ${firstName} ${lastName}`,
            `
            <h2 style="color:#00E599">New Consultation Booking Request</h2>
            <table style="border-collapse:collapse;width:100%;font-family:Arial">
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Name</strong></td><td style="padding:8px;border:1px solid #eee">${firstName} ${lastName}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Email</strong></td><td style="padding:8px;border:1px solid #eee">${email}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Phone</strong></td><td style="padding:8px;border:1px solid #eee">${phone || 'Not provided'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Company</strong></td><td style="padding:8px;border:1px solid #eee">${company || 'Not provided'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Role</strong></td><td style="padding:8px;border:1px solid #eee">${role || 'Not provided'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Country</strong></td><td style="padding:8px;border:1px solid #eee">${country}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Business Stage</strong></td><td style="padding:8px;border:1px solid #eee">${businessStage || 'Not provided'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Services Interested In</strong></td><td style="padding:8px;border:1px solid #eee">${services || 'Not specified'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Goals</strong></td><td style="padding:8px;border:1px solid #eee">${goals}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Timeline</strong></td><td style="padding:8px;border:1px solid #eee">${timeline || 'Not specified'}</td></tr>
                <tr><td style="padding:8px;border:1px solid #eee"><strong>Heard About Us Via</strong></td><td style="padding:8px;border:1px solid #eee">${referralSource || 'Not specified'}</td></tr>
            </table>
            `
        );

        res.status(201).json({ success: true, message: 'Consultation request received!', id: result.rows[0].id });
    } catch (err) {
        console.error('Booking save error:', err.message);
        res.status(500).json({ error: 'Failed to save your booking request.' });
    }
});

// ─── API: Admin — Get All Bookings ───────────────────────────
app.get('/api/admin/bookings', async (req, res) => {
    const { password } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const result = await db.query('SELECT * FROM bookings ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bookings.' });
    }
});

// ─── API: Admin — Get All Contacts ───────────────────────────
app.get('/api/admin/contacts', async (req, res) => {
    const { password } = req.query;
    if (password !== process.env.ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const result = await db.query('SELECT * FROM contacts ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch contacts.' });
    }
});

// ─── Fallback Route ───────────────────────────────────────────
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
