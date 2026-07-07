import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all photos for a specific student
router.get('/', async (req, res) => {
  const { studentID } = req.query;
  if (!studentID) {
    return res.status(400).json({ error: 'Missing studentID parameter' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT photoID AS id, photo_url, caption, timestamp, studentID FROM photo_diaries WHERE studentID = ? ORDER BY timestamp DESC',
      [studentID]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching photo diaries:', error);
    res.status(500).json({ error: 'Database error fetching photo diaries' });
  }
});

// POST a new photo diary entry
router.post('/', async (req, res) => {
  const { photo_url, caption, studentID } = req.body;
  if (!photo_url || !studentID) {
    return res.status(400).json({ error: 'Missing required photo diary fields' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO photo_diaries (photo_url, caption, studentID) VALUES (?, ?, ?)',
      [photo_url, caption || '', studentID]
    );
    res.status(201).json({
      id: result.insertId,
      photo_url,
      caption,
      studentID
    });
  } catch (error) {
    console.error('Error creating photo diary entry:', error);
    res.status(500).json({ error: 'Database error creating photo diary entry' });
  }
});

// DELETE a photo diary entry
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM photo_diaries WHERE photoID = ?', [id]);
    res.json({ message: 'Photo diary entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo diary entry:', error);
    res.status(500).json({ error: 'Database error deleting photo diary entry' });
  }
});

export default router;
