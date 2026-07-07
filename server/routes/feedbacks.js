import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all feedbacks with student and sport event name
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        f.id,
        f.rating,
        f.comment,
        f.category,
        f.studentid,
        f.sportid,
        f.timestamp,
        COALESCE(u.fullname, 'Unknown Student') AS studentName,
        COALESCE(f.eventName, s.sportname, 'General Feedback') AS eventName
      FROM feedbacks f
      LEFT JOIN users u ON f.studentid = u.id
      LEFT JOIN Sport_event s ON f.sportid = s.id
      ORDER BY f.timestamp DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching feedbacks:', error);
    res.status(500).json({ error: 'Database error fetching feedbacks' });
  }
});

// POST feedback
router.post('/', async (req, res) => {
  const { rating, comment, studentid, sportid, category, eventName } = req.body;
  if (!rating || !studentid) {
    return res.status(400).json({ error: 'Missing required feedback fields (rating, studentid)' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO feedbacks (rating, comment, studentid, sportid, category, eventName) VALUES (?, ?, ?, ?, ?, ?)',
      [rating, comment || null, studentid, sportid || null, category || null, eventName || null]
    );
    res.status(201).json({ id: result.insertId, rating, comment, studentid, sportid, category, eventName });
  } catch (error) {
    console.error('Error creating feedback:', error);
    res.status(500).json({ error: 'Database error creating feedback' });
  }
});

export default router;
