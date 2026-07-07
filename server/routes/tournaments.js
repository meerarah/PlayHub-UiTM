import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET all tournaments (supports optional ?status=active filter)
router.get('/', async (req, res) => {
  const { status } = req.query;
  try {
    let query = 'SELECT tournamentID AS id, name, sport, description, date, maxTeams, status, time, venue, createdAt FROM Tournaments';
    let params = [];
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    query += ' ORDER BY createdAt DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({ error: 'Database error fetching tournaments' });
  }
});

// GET specific tournament by ID
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query(
      'SELECT tournamentID AS id, name, sport, description, date, maxTeams, status, time, venue, createdAt FROM Tournaments WHERE tournamentID = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Tournament not found' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching tournament details:', error);
    res.status(500).json({ error: 'Database error fetching tournament details' });
  }
});

// POST create a new tournament (handles request approval inside transaction)
router.post('/', async (req, res) => {
  const { name, sport, date, time, venue, maxTeams, description, requestId } = req.body;
  if (!name || !sport || !date) {
    return res.status(400).json({ error: 'Missing required fields (name, sport, date)' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [result] = await connection.query(
      'INSERT INTO Tournaments (name, sport, date, time, venue, maxTeams, description, status, tournamentRequestID) VALUES (?, ?, ?, ?, ?, ?, ?, "active", ?)',
      [name, sport, date, time || '09:00 AM', venue || 'TBA', maxTeams || 8, description || '', requestId || null]
    );

    if (requestId) {
      await connection.query(
        'UPDATE Tournament_Requests SET status = "approved" WHERE tournamentRequestID = ?',
        [requestId]
      );
    }

    await connection.commit();
    res.status(201).json({ id: result.insertId, name, status: 'active' });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating tournament:', error);
    res.status(500).json({ error: 'Database error creating tournament' });
  } finally {
    connection.release();
  }
});

// PUT update a tournament
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, sport, date, time, venue, maxTeams, description } = req.body;
  try {
    await pool.query(
      'UPDATE Tournaments SET name = ?, sport = ?, date = ?, time = ?, venue = ?, maxTeams = ?, description = ? WHERE tournamentID = ?',
      [name, sport, date, time, venue, maxTeams, description, id]
    );
    res.json({ message: 'Tournament updated successfully' });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({ error: 'Database error updating tournament' });
  }
});

// DELETE a tournament
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM Tournaments WHERE tournamentID = ?', [id]);
    res.json({ message: 'Tournament deleted successfully' });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({ error: 'Database error deleting tournament' });
  }
});

// GET registrations for a specific tournament (including user metadata)
router.get('/:id/registrations', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT tr.tournamentRegistrationID AS id, tr.teamName, tr.teamID, tr.teamSlot, tr.participantCount, 
             tr.phoneNumber, tr.status, tr.memberMatrixIds, tr.members, tr.timestamp, tr.tournamentID, tr.studentID,
             COALESCE(u.fullname, 'Unknown Student') AS studentName,
             COALESCE(u.email, 'N/A') AS email,
             COALESCE(s.residencyType, 'College') AS residencyType,
             COALESCE(s.matrixID, 'N/A') AS matrixId
      FROM Tournament_Registrations tr
      LEFT JOIN users u ON tr.studentID = u.id
      LEFT JOIN students s ON tr.studentID = s.userID
      WHERE tr.tournamentID = ?
    `;
    const [rows] = await pool.query(query, [id]);
    
    const parsed = rows.map(r => ({
      ...r,
      members: r.members ? JSON.parse(r.members) : [],
      memberMatrixIds: r.memberMatrixIds ? JSON.parse(r.memberMatrixIds) : []
    }));
    
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching tournament registrations:', error);
    res.status(500).json({ error: 'Database error fetching tournament registrations' });
  }
});

// POST register a team for a tournament
router.post('/:id/registrations', async (req, res) => {
  const { id } = req.params;
  const { studentId, teamSlot, teamName, phone, participantsCount, members, memberMatrixIds } = req.body;
  
  if (!studentId || !teamSlot || !teamName || !phone || !members || !memberMatrixIds) {
    return res.status(400).json({ error: 'Missing required registration fields' });
  }
  
  try {
    const [existing] = await pool.query(
      'SELECT tournamentRegistrationID FROM Tournament_Registrations WHERE tournamentID = ? AND teamSlot = ?',
      [id, teamSlot]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This team slot is already taken' });
    }
    
    const [result] = await pool.query(
      `INSERT INTO Tournament_Registrations 
       (teamName, teamID, teamSlot, participantCount, phoneNumber, status, memberMatrixIds, members, tournamentID, studentID) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        teamName,
        memberMatrixIds[0] || null,
        teamSlot,
        participantsCount || 1,
        phone,
        'pending',
        JSON.stringify(memberMatrixIds),
        JSON.stringify(members),
        id,
        studentId
      ]
    );
    
    res.status(201).json({
      id: result.insertId,
      teamName,
      teamSlot,
      status: 'pending'
    });
  } catch (error) {
    console.error('Error registering team:', error);
    res.status(500).json({ error: 'Database error registering team' });
  }
});

// PUT update a registration status (accept/complete)
router.put('/registrations/:regId', async (req, res) => {
  const { regId } = req.params;
  const { status } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Get registration info
    const [[reg]] = await connection.query(
      'SELECT studentID FROM Tournament_Registrations WHERE tournamentRegistrationID = ?', 
      [regId]
    );

    if (!reg) {
      connection.release();
      return res.status(404).json({ error: 'Registration not found' });
    }

    // 2. Update status
    let queryStr = 'UPDATE Tournament_Registrations SET status = ?';
    let params = [status];
    if (status === 'completed') {
      queryStr += ', completedAt = NOW()';
    }
    queryStr += ' WHERE tournamentRegistrationID = ?';
    params.push(regId);
    await connection.query(queryStr, params);

    // 3. Award "The Rookie" badge if status is 'completed'
    if (status === 'completed' && reg.studentID) {
      const studentId = reg.studentID;
      
      // Ensure "The Rookie" badge exists
      let [[badge]] = await connection.query('SELECT badgeID FROM Badge WHERE badgeName = "The Rookie"');
      if (!badge) {
        const [badgeResult] = await connection.query(
          'INSERT INTO Badge (badgeName, imageIcon, description, type) VALUES ("The Rookie", "🏅", "Completed your first session!", "achievement")'
        );
        badge = { badgeID: badgeResult.insertId };
      }

      // Check if student already has this badge
      const [[hasBadge]] = await connection.query(
        'SELECT studentBadgeID FROM Student_Badge WHERE studentID = ? AND badgeID = ?',
        [studentId, badge.badgeID]
      );

      if (!hasBadge) {
        await connection.query(
          'INSERT INTO Student_Badge (studentID, badgeID) VALUES (?, ?)',
          [studentId, badge.badgeID]
        );
        console.log(`Badge 'The Rookie' awarded to tournament captain ${studentId}`);
      }
    }

    await connection.commit();
    res.json({ message: 'Registration status updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating registration status:', error);
    res.status(500).json({ error: 'Database error updating registration status' });
  } finally {
    connection.release();
  }
});

// POST create a tournament request from a student
router.post('/requests', async (req, res) => {
  const { studentId, sport, preferredDate, teamsCount, description, documentBase64 } = req.body;
  if (!studentId || !sport || !preferredDate) {
    return res.status(400).json({ error: 'Missing required request fields (studentId, sport, preferredDate)' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO Tournament_Requests 
       (studentID, sport, preferredDate, teamCount, description, document, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [studentId, sport, preferredDate, teamsCount || 4, description || '', documentBase64 || null]
    );
    res.status(201).json({ id: result.insertId, sport, status: 'pending' });
  } catch (error) {
    console.error('Error creating tournament request:', error);
    res.status(500).json({ error: 'Database error creating tournament request' });
  }
});

// GET all tournament requests (joined with student names)
router.get('/requests/all', async (req, res) => {
  try {
    const query = `
      SELECT tr.tournamentRequestID AS id, tr.createdByID, tr.description, tr.preferredDate, 
             tr.sport, tr.document, tr.status, tr.teamCount, tr.studentID,
             COALESCE(u.fullname, 'Unknown Student') AS studentName
      FROM Tournament_Requests tr
      LEFT JOIN users u ON tr.studentID = u.id
      ORDER BY tr.tournamentRequestID DESC
    `;
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tournament requests:', error);
    res.status(500).json({ error: 'Database error fetching requests' });
  }
});

// PUT update status of a request (accept/reject)
router.put('/requests/:requestId', async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;
  try {
    await pool.query(
      'UPDATE Tournament_Requests SET status = ? WHERE tournamentRequestID = ?',
      [status, requestId]
    );
    res.json({ message: 'Request status updated successfully' });
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ error: 'Database error updating request status' });
  }
});

// GET registrations for a student (where they are captain OR member roster player)
router.get('/student/:studentId/registrations', async (req, res) => {
  const { studentId } = req.params;
  const { matrixId } = req.query;
  
  try {
    let rows;
    if (matrixId) {
      const query = `
        SELECT tr.tournamentRegistrationID AS id, tr.teamName, tr.teamID, tr.teamSlot, tr.participantCount, 
               tr.phoneNumber, tr.status, tr.memberMatrixIds, tr.members, tr.timestamp, tr.tournamentID, tr.studentID,
               t.name AS tournamentName, t.sport AS tournamentSport, t.date AS tournamentDate
        FROM Tournament_Registrations tr
        JOIN Tournaments t ON tr.tournamentID = t.tournamentID
        WHERE tr.studentID = ? OR tr.memberMatrixIds LIKE ?
      `;
      [rows] = await pool.query(query, [studentId, `%${matrixId}%`]);
    } else {
      const query = `
        SELECT tr.tournamentRegistrationID AS id, tr.teamName, tr.teamID, tr.teamSlot, tr.participantCount, 
               tr.phoneNumber, tr.status, tr.memberMatrixIds, tr.members, tr.timestamp, tr.tournamentID, tr.studentID,
               t.name AS tournamentName, t.sport AS tournamentSport, t.date AS tournamentDate
        FROM Tournament_Registrations tr
        JOIN Tournaments t ON tr.tournamentID = t.tournamentID
        WHERE tr.studentID = ?
      `;
      [rows] = await pool.query(query, [studentId]);
    }
    
    const parsed = rows.map(r => ({
      ...r,
      members: r.members ? JSON.parse(r.members) : [],
      memberMatrixIds: r.memberMatrixIds ? JSON.parse(r.memberMatrixIds) : []
    }));
    
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching student registrations:', error);
    res.status(500).json({ error: 'Database error fetching student registrations' });
  }
});

export default router;
