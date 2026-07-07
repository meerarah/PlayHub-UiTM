import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all notifications for a user
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId parameter' });
  }

  try {
    const [rows] = await pool.query(
      'SELECT notificationID AS id, userID, adminID, title, message, type, status, createdAt FROM notifications WHERE userID = ? ORDER BY createdAt DESC',
      [userId]
    );

    // Map `status` to `isRead` to maintain frontend compatibility
    const mapped = rows.map(r => ({
      ...r,
      isRead: r.status === 'read'
    }));

    res.json(mapped);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Database error fetching notifications' });
  }
});

// POST a new notification
router.post('/', async (req, res) => {
  const { userId, title, message, type } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'Missing required notification fields' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO notifications (userID, title, message, type, status) VALUES (?, ?, ?, ?, "unread")',
      [userId, title, message || '', type || 'info']
    );
    res.status(201).json({
      id: result.insertId,
      userId,
      title,
      message,
      type,
      isRead: false
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Database error creating notification' });
  }
});

// PUT mark a notification as read
router.put('/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE notifications SET status = "read" WHERE notificationID = ?', [id]);
    res.json({ message: 'Notification marked as read successfully' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Database error updating notification' });
  }
});

// PUT mark all notifications as read for a user
router.put('/read-all', async (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId field' });
  }

  try {
    await pool.query('UPDATE notifications SET status = "read" WHERE userID = ? AND status = "unread"', [userId]);
    res.json({ message: 'All notifications marked as read successfully' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Database error updating notifications' });
  }
});

// DELETE a notification
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM notifications WHERE notificationID = ?', [id]);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Database error deleting notification' });
  }
});

export default router;
