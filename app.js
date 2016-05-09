var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
var session = require('express-session');
var flash = require('express-flash');

var env = require('dotenv');
env.config();

// Authentication
var pg = require('pg').native;
// var pg = require('pg') // this is for local database use only
// javascript password encryption (https://www.npmjs.com/package/bcryptjs)
var bcrypt = require('bcryptjs');
//  authentication middleware
var passport = require('passport');
// authentication locally (not using passport-google, passport-twitter, passport-github...)
var LocalStrategy = require('passport-local').Strategy;

passport.use(new LocalStrategy({
    usernameField: 'username', // form field
    passwordField: 'password'
  },
  function(username, password, done) {
    pg.connect(process.env.DATABASE_URL, function(err, client, next) {
      if (err) {
        return console.error("Unable to connect to database");
      }
      console.log("Connected to database");
      client.query('SELECT * FROM users WHERE username = $1', [username], function(err, result) {
        // Release client back to pool
        next();
        if (err) {
          console.log("Database error");
          return done(err);
        }
        if (result.rows.length > 0) {
          var matched = bcrypt.compareSync(password, result.rows[0].password);
          if (matched) {
            console.log("Successful login");
            return done(null, result.rows[0]);
          }
        }
        console.log("Bad username or password");
        return done(null, false, {message: 'Bad username or password'});
      });
    });
  })
);

// Store user information into session
passport.serializeUser(function(user, done) {
  //return done(null, user.id);
  return done(null, user);
});

// Get user information out of session
passport.deserializeUser(function(id, done) {
  return done(null, id);
});

// Use the session middleware
// configure session object to handle cookie
app.use(session({
  //proxy: true,
  secret: 'COMP335',
//  cookie: { maxAge: 60000 },
  resave:false,
  saveUninitialized: true,
//  cookie: { secure: app.get('env') === 'production' }
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
