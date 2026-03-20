import 'dotenv/config';
import cookieParser from 'cookie-parser';
import express from 'express';
import path from 'path';

import { HttpError } from './types/HttpError';
import { STATUS_CODES } from 'http';
import locals from './middleware/locals';

import { database } from './data/database';
import adminRoutes from './routes/admin/admin';
import detailsRoutes from './routes/details';
import guestbookRoutes from './routes/guestbook';
import photosRoutes from './routes/photos';
import projectorRoutes from './routes/projector';
import rsvpRoutes from './routes/rsvp';

const app = express();
const PORT = process.env.PORT ?? 3000;

// View engine: Pug
const viewsPath = path.join(__dirname, '..', 'views');
app.set('view engine', 'pug');
app.set('views', viewsPath);
// Resolve absolute paths in "extends" and "include" from the views directory
app.locals.basedir = viewsPath;

// Middleware
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(locals);

// Routes
app.use('/admin', adminRoutes);
app.use('/details', detailsRoutes);
app.use('/guestbook', guestbookRoutes);
app.use('/photos', photosRoutes);
app.use('/projector', projectorRoutes);
app.use('/rsvp', rsvpRoutes);
app.get('/', (req, res) => res.render('pages/index'));

// Catch-all: no route matched
app.use((req, _res, next) => {
  next(new HttpError(404));
});

// Error handler: catches errors passed to next(err)
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  let message = err.message;
  let status = 500;
  let title = STATUS_CODES[status];
  let context: Record<string, unknown> | undefined;

  if (err instanceof HttpError) {
    title = STATUS_CODES[err.status];
    status = err.status;
    message = err.message;
    context = err.context;
  }

  if (Math.floor(status / 100) === 5) console.error(err);

  res.status(status);
  
  if (process.env.NODE_ENV === 'development') {
    res.render('error', {
      title,
      message,
      status,
      originalUrl: req.originalUrl,
      context,
    });
  } else if (err instanceof HttpError && err.isPublic()) {
    res.render('error', {
      title,
      status,
      message
    });
  } else {
    res.render('error', {
      title,
      status,
    });
  }
});

async function start(): Promise<void> {
  await database.init(); // eager init: seed / future DB connect before accepting traffic
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
