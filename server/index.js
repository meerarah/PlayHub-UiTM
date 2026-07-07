import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './db.js';
import courtsRouter from './routes/courts.js';
import feedbacksRouter from './routes/feedbacks.js';
import usersRouter from './routes/users.js';
import tournamentsRouter from './routes/tournaments.js';
import photosRouter from './routes/photos.js';
import notificationsRouter from './routes/notifications.js';
import eventsRouter from './routes/events.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Routes
app.use('/api/courts', courtsRouter);
app.use('/api/feedbacks', feedbacksRouter);
app.use('/api/users', usersRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/photos', photosRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/events', eventsRouter);

// Root test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to PlayHub Express MySQL API Backend!' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  await testConnection();
});
