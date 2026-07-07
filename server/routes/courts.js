import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all courts (mapping courtID as id for React frontend)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT courtID AS id, arena, name, sport, capacity, image FROM courts');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching courts:', error);
    res.status(500).json({ error: 'Database error fetching courts' });
  }
});

// POST add a court (inserts into courts and returns inserted courtID as id)
router.post('/', async (req, res) => {
  const { arena, name, sport, capacity, image } = req.body;
  if (!arena || !name || !sport || !capacity) {
    return res.status(400).json({ error: 'Missing required court fields (arena, name, sport, capacity)' });
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO courts (arena, name, sport, capacity, image) VALUES (?, ?, ?, ?, ?)',
      [arena, name, sport, capacity, image || null]
    );
    res.status(201).json({ id: result.insertId, arena, name, sport, capacity, image });
  } catch (error) {
    console.error('Error creating court:', error);
    res.status(500).json({ error: 'Database error creating court' });
  }
});

// PUT update a court
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { arena, name, sport, capacity, image } = req.body;
  try {
    await pool.query(
      'UPDATE courts SET arena = ?, name = ?, sport = ?, capacity = ?, image = ? WHERE courtID = ?',
      [arena || 'Pusat Sukan', name, sport, capacity, image || null, id]
    );
    res.json({ message: 'Court updated successfully' });
  } catch (error) {
    console.error('Error updating court:', error);
    res.status(500).json({ error: 'Database error updating court' });
  }
});

// DELETE a court
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM courts WHERE courtID = ?', [id]);
    res.json({ message: 'Court deleted successfully' });
  } catch (error) {
    console.error('Error deleting court:', error);
    res.status(500).json({ error: 'Database error deleting court' });
  }
});

export default router;
