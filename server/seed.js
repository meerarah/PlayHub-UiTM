import pool from './db.js';

const courts = [
  // Arena 1
  { arena: "Arena 1", name: "Gelanggang Bola Sepak 5 Sebelah A", sport: "Futsal", capacity: 10, image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80" },
  { arena: "Arena 1", name: "Gelanggang Bola Sepak 5 Sebelah B", sport: "Futsal", capacity: 10, image: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80" },
  { arena: "Arena 1", name: "Gelanggang Bola Keranjang A", sport: "Basketball", capacity: 10, image: "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&q=80" },
  { arena: "Arena 1", name: "Gelanggang Bola Keranjang B", sport: "Basketball", capacity: 10, image: "https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800&q=80" },
  
  // Arena 2
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 1", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 2", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 3", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 4", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 5", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 6", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },
  { arena: "Arena 2", name: "Gelanggang Boling Padang Rink 7", sport: "Lawn Bowls", capacity: 4, image: "https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80" },

  // Arena 3
  { arena: "Arena 3", name: "Kriket Batting Cage 1", sport: "Cricket", capacity: 4, image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80" },
  { arena: "Arena 3", name: "Kriket Batting Cage 2", sport: "Cricket", capacity: 4, image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80" },
  { arena: "Arena 3", name: "Kriket Batting Cage 3", sport: "Cricket", capacity: 4, image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80" },
  { arena: "Arena 3", name: "Kriket Batting Cage 4", sport: "Cricket", capacity: 4, image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&q=80" },

  // Arena 7
  { arena: "Arena 7", name: "Bola Sepak 5 Sebelah A", sport: "Futsal", capacity: 10, image: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&q=80" },
  { arena: "Arena 7", name: "Bola Sepak 5 Sebelah B", sport: "Futsal", capacity: 10, image: "https://images.unsplash.com/photo-1543326727-cf6c39e8f84c?w=800&q=80" },

  // Arena 6
  { arena: "Arena 6", name: "Gelanggang Badminton A", sport: "Badminton", capacity: 4, image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80" },
  { arena: "Arena 6", name: "Gelanggang Badminton B", sport: "Badminton", capacity: 4, image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80" },
  { arena: "Arena 6", name: "Gelanggang Badminton C", sport: "Badminton", capacity: 4, image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80" },
  { arena: "Arena 6", name: "Gelanggang Badminton D", sport: "Badminton", capacity: 4, image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=800&q=80" }
];

const tournaments = [
  { name: "Piala Dekan Futsal Tournament 2026", sport: "Futsal", date: "2026-08-20", time: "08:00 AM - 05:00 PM", venue: "Arena 1 (Gelanggang Futsal)", maxTeams: 8, description: "Official inter-faculty futsal championship. Register your team now and win cash prizes!" },
  { name: "UiTM Badminton Doubles Open", sport: "Badminton", date: "2026-09-12", time: "09:00 AM - 04:00 PM", venue: "Arena 6 (Gelanggang Badminton)", maxTeams: 16, description: "Open doubles tournament. Compete with top campus teams. Certificates provided for all participants!" },
  { name: "Pusat Sukan Lawn Bowls Championship", sport: "Lawn Bowls", date: "2026-10-18", time: "10:00 AM - 06:00 PM", venue: "Arena 2 (Boling Padang Rink)", maxTeams: 6, description: "Lawn Bowls tournament for resident and non-resident students. Equipment provided." }
];

async function seed() {
  try {
    // 1. Ensure courts table exists with courtID as PK
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courts (
        courtID INT AUTO_INCREMENT PRIMARY KEY,
        arena VARCHAR(100) NOT NULL,
        name VARCHAR(255) NOT NULL,
        sport VARCHAR(100) NOT NULL,
        capacity INT NOT NULL,
        image TEXT
      )
    `);

    // 2. Clear existing records in courts
    await pool.query('DELETE FROM courts');
    console.log('🗑️ Cleared existing records in courts table.');

    // 3. Insert court records
    for (const court of courts) {
      await pool.query(
        'INSERT INTO courts (arena, name, sport, capacity, image) VALUES (?, ?, ?, ?, ?)',
        [court.arena, court.name, court.sport, court.capacity, court.image]
      );
      console.log(`🌱 Seeded Court: ${court.arena} - ${court.name}`);
    }

    // 4. Ensure Tournaments table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Tournaments (
        tournamentID INT AUTO_INCREMENT PRIMARY KEY,
        createdByID VARCHAR(255),
        date VARCHAR(50) NOT NULL,
        description TEXT,
        maxTeams INT,
        name VARCHAR(255) NOT NULL,
        sport VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        time VARCHAR(50) NOT NULL,
        venue VARCHAR(255) NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 5. Clear existing tournaments
    await pool.query('DELETE FROM Tournaments');
    console.log('🗑️ Cleared existing records in Tournaments table.');

    // 6. Insert tournaments
    for (const t of tournaments) {
      await pool.query(
        'INSERT INTO Tournaments (name, sport, date, time, venue, maxTeams, description, status) VALUES (?, ?, ?, ?, ?, ?, ?, "active")',
        [t.name, t.sport, t.date, t.time, t.venue, t.maxTeams, t.description]
      );
      console.log(`🏆 Seeded Tournament: ${t.name}`);
    }

    // 7. Ensure Badge table exists and seed it
    await pool.query(`
      CREATE TABLE IF NOT EXISTS Badge (
        badgeID INT AUTO_INCREMENT PRIMARY KEY,
        badgeName VARCHAR(255) NOT NULL,
        imageIcon TEXT,
        description TEXT,
        type VARCHAR(50)
      )
    `);
    await pool.query('DELETE FROM Badge');
    console.log('🗑️ Cleared existing records in Badge table.');

    const badges = [
      { badgeName: "The Rookie", imageIcon: "🏅", description: "Completed your first session!", type: "achievement" },
      { badgeName: "Team Player", imageIcon: "🤝", description: "Joined a shared session.", type: "social" },
      { badgeName: "Court Legend", imageIcon: "🏛️", description: "Completed 5 sessions.", type: "loyalty" }
    ];
    for (const b of badges) {
      await pool.query(
        'INSERT INTO Badge (badgeName, imageIcon, description, type) VALUES (?, ?, ?, ?)',
        [b.badgeName, b.imageIcon, b.description, b.type]
      );
      console.log(`🏅 Seeded Badge: ${b.badgeName}`);
    }

    console.log('✅ MySQL Database seeding completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding MySQL database:', error.message);
    process.exit(1);
  }
}

seed();
