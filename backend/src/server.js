import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import casesRouter from './routes/cases.js';
import documentsRouter from './routes/documents.js';
import childrenRouter from './routes/children.js';
import profilesRouter from './routes/profiles.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.use('/api/cases', casesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/children', childrenRouter);
app.use('/api/profiles', profilesRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => console.log(`HopeConnect API running on port ${PORT}`));
