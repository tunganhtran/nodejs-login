import express = require('express');
import path = require('path');
import cookieParser = require('cookie-parser');
import session = require('express-session');
import csrf = require('csurf');
import passport = require('passport');
import logger = require('morgan');
import SQLiteStore = require('connect-sqlite3');

import { ErrorRequestHandler } from 'express';
import createError from 'http-errors';

import indexRouter from './routes/index';
import localRouter from './routes/local-auth';
import googleRouter from './routes/google-auth';
import facebookRouter from './routes/facebook-auth';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface User {
      id: string;
      name: string;
    }
  }
}

declare module 'express-session' {
  export interface SessionData {
    messages?: string[];
  }
}

passport.serializeUser(function (user, done) {
  process.nextTick(function () {
    done(null, user);
  });
});

passport.deserializeUser(function (user: Express.User, done) {
  process.nextTick(function () {
    return done(null, user);
  });
});

const app = express();
const SQLiteStoreWithSession = SQLiteStore(session);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.locals.pluralize = require('pluralize');

app.use(
  session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new SQLiteStoreWithSession({
      db: 'sessions.db',
      dir: 'database',
    }),
  }),
);

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(csrf({ cookie: true }));
app.use(passport.authenticate('session'));

app.use(function (req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/', indexRouter);
app.use('/', localRouter);
app.use('/google', googleRouter);
app.use('/facebook', facebookRouter);

app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
const errorHandler: ErrorRequestHandler = (err, req, res) => {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
};

app.use(errorHandler);

app.listen(8080, () => {
  console.log('listening on port 8080');
});
