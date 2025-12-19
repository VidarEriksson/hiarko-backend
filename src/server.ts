import "dotenv/config";
import express from 'express';
import authRoutes from './routes/auth';
import boardRoutes from './routes/board';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('hello world');
});

app.use('/auth', authRoutes);
app.use('/boards', boardRoutes); 

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});