import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET user by ID (joined with student details if role is student)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const query = `
      SELECT u.id, u.fullname, u.email, u.role, u.profileImageUrl, u.createdAt,
             s.collegeName, s.residencyType, s.phoneNumber, s.matrixID
      FROM users u
      LEFT JOIN students s ON u.id = s.userID
      WHERE u.id = ?
    `;
    const [rows] = await pool.query(query, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Map the database values back to format expected by React frontend
    const user = {
      ...rows[0],
      matrixId: rows[0].matrixID // React expects matrixId (camelCase)
    };
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Database error fetching user' });
  }
});

// POST upsert user (handles superclass 'users' and subclasses 'students' / 'admins')
router.post('/', async (req, res) => {
  const { id, fullname, email, role, matrixId, residencyType, collegeName, phoneNumber } = req.body;
  if (!id || !fullname || !email) {
    return res.status(400).json({ error: 'Missing required user fields (id, fullname, email)' });
  }
  
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Upsert into core 'users' table
    const userQuery = `
      INSERT INTO users (id, fullname, email, role)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fullname = VALUES(fullname),
        email = VALUES(email),
        role = COALESCE(VALUES(role), users.role)
    `;
    await connection.query(userQuery, [id, fullname, email, role || 'student']);

    // 2. Sync to subclass tables based on role
    const resolvedRole = (role || 'student').toLowerCase();
    if (resolvedRole === 'student') {
      const studentQuery = `
        INSERT INTO students (userID, collegeName, residencyType, phoneNumber, matrixID)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          collegeName = VALUES(collegeName),
          residencyType = VALUES(residencyType),
          phoneNumber = VALUES(phoneNumber),
          matrixID = VALUES(matrixID)
      `;
      await connection.query(studentQuery, [
        id,
        collegeName || 'UiTM',
        residencyType || null,
        phoneNumber || null,
        matrixId || null
      ]);
    } else if (resolvedRole === 'admin') {
      const adminQuery = `
        INSERT INTO admins (userID)
        VALUES (?)
        ON DUPLICATE KEY UPDATE userID = userID
      `;
      await connection.query(adminQuery, [id]);
    }

    await connection.commit();
    res.status(200).json({ message: 'User synced successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error syncing user:', error);
    res.status(500).json({ error: 'Database error syncing user' });
  } finally {
    connection.release();
  }
});

// GET a student's badges (joined with badge details, with auto-award logic)
router.get('/:id/badges', async (req, res) => {
  const { id } = req.params;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Local today in YYYY-MM-DD
    const todayObj = new Date();
    const yyyy = todayObj.getFullYear();
    const mm = String(todayObj.getMonth() + 1).padStart(2, '0');
    const dd = String(todayObj.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const currentHour = todayObj.getHours();

    // 1. Check & Award "The Rookie" Badge
    const [[hasRookie]] = await connection.query(
      `SELECT sb.studentBadgeID FROM Student_Badge sb
       JOIN Badge b ON sb.badgeID = b.badgeID
       WHERE sb.studentID = ? AND b.badgeName = 'The Rookie'`,
      [id]
    );

    if (!hasRookie) {
      const [[hasCompletedTournament]] = await connection.query(
        `SELECT tournamentRegistrationID FROM Tournament_Registrations 
         WHERE studentID = ? AND status = 'completed'`,
        [id]
      );

      const [pastBookings] = await connection.query(
        `SELECT r.registrationID FROM Registration r
         JOIN Sport_event se ON r.sportID = se.sportID
         WHERE r.studentID = ? 
           AND (r.status = 'completed' OR (r.status = 'approved' AND (se.date < ? OR (se.date = ? AND se.slot < ?))))`,
        [id, todayStr, todayStr, currentHour]
      );

      if (hasCompletedTournament || pastBookings.length > 0) {
        let [[badge]] = await connection.query('SELECT badgeID FROM Badge WHERE badgeName = "The Rookie"');
        if (!badge) {
          const [badgeResult] = await connection.query(
            'INSERT INTO Badge (badgeName, imageIcon, description, type) VALUES ("The Rookie", "🏅", "Completed your first session!", "achievement")'
          );
          badge = { badgeID: badgeResult.insertId };
        }
        await connection.query(
          'INSERT INTO Student_Badge (studentID, badgeID) VALUES (?, ?)',
          [id, badge.badgeID]
        );
      }
    }

    // 2. Check & Award "Team Player" Badge
    const [[hasTeamPlayer]] = await connection.query(
      `SELECT sb.studentBadgeID FROM Student_Badge sb
       JOIN Badge b ON sb.badgeID = b.badgeID
       WHERE sb.studentID = ? AND b.badgeName = 'Team Player'`,
      [id]
    );

    if (!hasTeamPlayer) {
      // Check if student joined a shared court booking session that has passed
      const [pastShared] = await connection.query(
        `SELECT r.registrationID FROM Registration r
         JOIN Sport_event se ON r.sportID = se.sportID
         WHERE r.studentID = ? AND se.type = 'shared_session'
           AND (r.status = 'completed' OR (r.status = 'approved' AND (se.date < ? OR (se.date = ? AND se.slot < ?))))`,
        [id, todayStr, todayStr, currentHour]
      );

      // Check if student has joined any tournament team (either as captain or as roster member)
      let joinedTournamentTeam = false;
      const [[studentRow]] = await connection.query(
        'SELECT matrixID FROM students WHERE userID = ?',
        [id]
      );

      if (studentRow && studentRow.matrixID) {
        const matrixId = studentRow.matrixID;
        const [[tournTeam]] = await connection.query(
          `SELECT tournamentRegistrationID FROM Tournament_Registrations 
           WHERE studentID = ? OR memberMatrixIds LIKE ?`,
          [id, `%${matrixId}%`]
        );
        if (tournTeam) {
          joinedTournamentTeam = true;
        }
      } else {
        const [[tournTeam]] = await connection.query(
          'SELECT tournamentRegistrationID FROM Tournament_Registrations WHERE studentID = ?',
          [id]
        );
        if (tournTeam) {
          joinedTournamentTeam = true;
        }
      }

      if (pastShared.length > 0 || joinedTournamentTeam) {
        let [[badge]] = await connection.query('SELECT badgeID FROM Badge WHERE badgeName = "Team Player"');
        if (!badge) {
          const [badgeResult] = await connection.query(
            'INSERT INTO Badge (badgeName, imageIcon, description, type) VALUES ("Team Player", "🤝", "Joined a shared session.", "social")'
          );
          badge = { badgeID: badgeResult.insertId };
        }
        await connection.query(
          'INSERT INTO Student_Badge (studentID, badgeID) VALUES (?, ?)',
          [id, badge.badgeID]
        );
      }
    }

    // 3. Check & Award "Court Legend" Badge
    const [[hasLegend]] = await connection.query(
      `SELECT sb.studentBadgeID FROM Student_Badge sb
       JOIN Badge b ON sb.badgeID = b.badgeID
       WHERE sb.studentID = ? AND b.badgeName = 'Court Legend'`,
      [id]
    );

    if (!hasLegend) {
      const [[tournCountRow]] = await connection.query(
        `SELECT COUNT(*) AS count FROM Tournament_Registrations 
         WHERE studentID = ? AND status = 'completed'`,
        [id]
      );

      const [[bookingsCountRow]] = await connection.query(
        `SELECT COUNT(*) AS count FROM Registration r
         JOIN Sport_event se ON r.sportID = se.sportID
         WHERE r.studentID = ? 
           AND (r.status = 'completed' OR (r.status = 'approved' AND (se.date < ? OR (se.date = ? AND se.slot < ?))))`,
        [id, todayStr, todayStr, currentHour]
      );

      const totalCompleted = (tournCountRow.count || 0) + (bookingsCountRow.count || 0);
      if (totalCompleted >= 5) {
        let [[badge]] = await connection.query('SELECT badgeID FROM Badge WHERE badgeName = "Court Legend"');
        if (!badge) {
          const [badgeResult] = await connection.query(
            'INSERT INTO Badge (badgeName, imageIcon, description, type) VALUES ("Court Legend", "🏛️", "Completed 5 sessions.", "loyalty")'
          );
          badge = { badgeID: badgeResult.insertId };
        }
        await connection.query(
          'INSERT INTO Student_Badge (studentID, badgeID) VALUES (?, ?)',
          [id, badge.badgeID]
        );
      }
    }

    await connection.commit();

    // 4. Return all student badges
    const queryStr = `
      SELECT sb.studentBadgeID AS id, sb.studentID AS studentid, sb.badgeID AS badgeid, sb.awardedAt,
             b.badgeName AS badgename, b.imageIcon AS image_icon, b.description, b.type
      FROM Student_Badge sb
      JOIN Badge b ON sb.badgeID = b.badgeID
      WHERE sb.studentID = ?
    `;
    const [rows] = await pool.query(queryStr, [id]);
    
    const mapped = rows.map(r => ({
      id: r.id,
      studentid: r.studentid,
      badgeid: r.badgeid,
      awardedAt: r.awardedAt,
      Badge: {
        badgename: r.badgename,
        image_icon: r.image_icon,
        description: r.description,
        type: r.type
      }
    }));
    res.json(mapped);
  } catch (error) {
    await connection.rollback();
    console.error('Error fetching/updating student badges:', error);
    res.status(500).json({ error: 'Database error fetching student badges' });
  } finally {
    connection.release();
  }
});

export default router;
