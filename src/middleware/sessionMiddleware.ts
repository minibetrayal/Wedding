import session from 'express-session';

const SESSION_SECRET = process.env.SESSION_SECRET!;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export default session({
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: 'lax',
      maxAge: ONE_WEEK_MS,
    },
  })