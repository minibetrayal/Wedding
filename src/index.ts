import 'dotenv/config';
import express from 'express';
import path from 'path';

import { createHttpError, HttpError } from './util/errors';

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '..', 'public')));

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
  next(createHttpError(404));
});

// Error handler: catches errors passed to next(err)
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  let message = err.message;
  let status = 500;
  let context: Record<string, unknown> | undefined;

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    context = err.context;
  }

  if (Math.floor(status / 100) === 5) console.error(err);
  res.status(status);
  if (process.env.NODE_ENV === 'development' || (err instanceof HttpError && err.isPublic())) {
    res.render('error', {
      title: message,
      status,
      originalUrl: req.originalUrl,
      ...context,
    });
  } else {
    res.render('error', {
      title: 'Something Went Wrong',
      status,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
