import express from 'express';
import dotenv from 'dotenv';
dotenv.config();
import authRoutes from './routes/auth';

const app = express();
app.use(express.json());


app.get('/', (req, res) => {
  res.send('hello world');
});

app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});