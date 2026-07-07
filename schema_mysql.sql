-- schema_mysql.sql
-- MySQL Schema for PlayHub Application (Aligned with ERD)

-- 1. Create Database if not exists
CREATE DATABASE IF NOT EXISTS playhub;
USE playhub;

-- 2. Users Table (USER Superclass)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY, -- Firebase UID (userID in ERD)
    fullname VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) DEFAULT 'student', -- 'student' or 'admin'
    profileImageUrl TEXT,
    createdByID VARCHAR(255), -- Self-referencing FK for who created the user (e.g. admin creating user)
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdByID) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Students Table (STUDENT Subclass)
CREATE TABLE IF NOT EXISTS students (
    userID VARCHAR(255) PRIMARY KEY,
    collegeName VARCHAR(255) DEFAULT 'UiTM',
    residencyType VARCHAR(50), -- 'College' or 'NR'
    phoneNumber VARCHAR(50),
    matrixID VARCHAR(50) UNIQUE,
    FOREIGN KEY (userID) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Admins Table (ADMIN Subclass)
CREATE TABLE IF NOT EXISTS admins (
    userID VARCHAR(255) PRIMARY KEY,
    FOREIGN KEY (userID) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Courts Table (COURTS in ERD - Fixed PK from feedbackID to courtID)
CREATE TABLE IF NOT EXISTS courts (
    courtID INT AUTO_INCREMENT PRIMARY KEY,
    arena VARCHAR(100) NOT NULL, -- e.g. 'Arena 1'
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    image TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Sport Events / Bookings Table (SPORT EVENT in ERD)
CREATE TABLE IF NOT EXISTS Sport_event (
    sportID INT AUTO_INCREMENT PRIMARY KEY,
    sportname VARCHAR(255) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    date VARCHAR(50) NOT NULL, -- YYYY-MM-DD
    time VARCHAR(50) NOT NULL, -- HH:mm
    maxplayers INT,
    currentPlayers INT DEFAULT 0,
    difficultylevel VARCHAR(50) DEFAULT 'Beginner',
    createdByID VARCHAR(255), -- FK referencing users(id) (Admin who created)
    type VARCHAR(50) NOT NULL, -- 'full_court', 'shared_session', 'event'
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'completed'
    proofUrl LONGTEXT,
    slot INT, -- Booking slot hour
    phoneNumber VARCHAR(50),
    courtID INT, -- FK referencing courts
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (courtID) REFERENCES courts(courtID) ON DELETE CASCADE,
    FOREIGN KEY (createdByID) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Registrations Table (REGISTRATION in ERD)
CREATE TABLE IF NOT EXISTS Registration (
    registrationID INT AUTO_INCREMENT PRIMARY KEY, -- registerSportID in ERD
    sportID INT NOT NULL, -- FK referencing Sport_event
    studentID VARCHAR(255) NOT NULL, -- FK referencing users (specifically students)
    participantCount INT DEFAULT 1,
    proofUrl LONGTEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed'
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sportID) REFERENCES Sport_event(sportID) ON DELETE CASCADE,
    FOREIGN KEY (studentID) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Badges Table (BADGE in ERD)
CREATE TABLE IF NOT EXISTS Badge (
    badgeID INT AUTO_INCREMENT PRIMARY KEY,
    badgeName VARCHAR(255) NOT NULL,
    imageIcon TEXT,
    description TEXT,
    type VARCHAR(50) -- 'achievement', 'social', 'loyalty'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Student Badges Table (STUDENT BADGE in ERD)
CREATE TABLE IF NOT EXISTS Student_Badge (
    studentBadgeID INT AUTO_INCREMENT PRIMARY KEY,
    studentID VARCHAR(255) NOT NULL, -- FK referencing users (specifically students)
    badgeID INT NOT NULL, -- FK referencing Badge
    awardedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badgeID) REFERENCES Badge(badgeID) ON DELETE CASCADE,
    UNIQUE KEY unique_student_badge (studentID, badgeID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. Feedbacks Table (FEEDBACKS in ERD)
CREATE TABLE IF NOT EXISTS feedbacks (
    feedbackID INT AUTO_INCREMENT PRIMARY KEY,
    rating INT CHECK(rating BETWEEN 1 AND 5),
    comment TEXT,
    category VARCHAR(100),
    eventName VARCHAR(255),
    studentID VARCHAR(255) NOT NULL, -- FK referencing users (specifically students)
    sportID INT, -- FK referencing Sport_event (optional connection)
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (studentID) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sportID) REFERENCES Sport_event(sportID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. Notifications Table (NOTIFICATION in ERD)
CREATE TABLE IF NOT EXISTS notifications (
    notificationID INT AUTO_INCREMENT PRIMARY KEY,
    userID VARCHAR(255) NOT NULL, -- FK referencing users (recipient)
    adminID VARCHAR(255), -- FK referencing users (sender)
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) DEFAULT 'info', -- 'booking', 'event', 'info'
    status VARCHAR(50) DEFAULT 'unread', -- 'unread', 'read'
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userID) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (adminID) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. Photo Diaries Table (PHOTO DIARIES in ERD)
CREATE TABLE IF NOT EXISTS photo_diaries (
    photoID INT AUTO_INCREMENT PRIMARY KEY,
    photo_url LONGTEXT NOT NULL,
    caption TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    studentID VARCHAR(255) NOT NULL, -- FK referencing users (specifically students)
    FOREIGN KEY (studentID) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. Tournament Requests Table (TOURNAMENT REQUESTS in ERD)
CREATE TABLE IF NOT EXISTS Tournament_Requests (
    tournamentRequestID INT AUTO_INCREMENT PRIMARY KEY,
    createdByID VARCHAR(255), -- FK referencing users (sender)
    description TEXT,
    preferredDate VARCHAR(50),
    sport VARCHAR(100),
    document LONGTEXT,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    teamCount INT,
    studentID VARCHAR(255) NOT NULL, -- FK referencing users (specifically students)
    FOREIGN KEY (studentID) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. Tournaments Table (TOURNAMENTS in ERD)
CREATE TABLE IF NOT EXISTS Tournaments (
    tournamentID INT AUTO_INCREMENT PRIMARY KEY,
    createdByID VARCHAR(255), -- FK referencing users (admin creator)
    date VARCHAR(50) NOT NULL,
    description TEXT,
    maxTeams INT,
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    time VARCHAR(50) NOT NULL,
    venue VARCHAR(255) NOT NULL,
    tournamentRequestID INT, -- FK referencing Tournament_Requests (if created from a request)
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (createdByID) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (tournamentRequestID) REFERENCES Tournament_Requests(tournamentRequestID) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. Tournament Registrations Table (TOURNAMENT REGISTRATION in ERD)
CREATE TABLE IF NOT EXISTS Tournament_Registrations (
    tournamentRegistrationID INT AUTO_INCREMENT PRIMARY KEY,
    teamName VARCHAR(255) NOT NULL,
    teamID VARCHAR(100), -- e.g. Student matrix ID of registration representative
    teamSlot VARCHAR(50), -- e.g. Team A, Team B
    participantCount INT DEFAULT 1,
    phoneNumber VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'confirmed', 'completed'
    memberMatrixIds TEXT, -- Stores array of team member IDs as text/JSON
    members TEXT, -- Stores array of team member names as text/JSON
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    completedAt DATETIME,
    tournamentID INT NOT NULL, -- FK referencing Tournaments
    studentID VARCHAR(255) NOT NULL, -- FK referencing users (team captain)
    FOREIGN KEY (tournamentID) REFERENCES Tournaments(tournamentID) ON DELETE CASCADE,
    FOREIGN KEY (studentID) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
