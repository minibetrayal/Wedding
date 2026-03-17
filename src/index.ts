import 'dotenv/config';
import express from 'express';
import path from 'path';

const app = express();
const PORT = process.env.PORT ?? 3000;

// View engine: Pug
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, '..', 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
