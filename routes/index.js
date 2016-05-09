var express = require('express');
var router = express.Router();
var passport = require('passport');
var pg = require('pg').native;
var bcrypt = require('bcryptjs');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('index', { user: req.user }); //display user.hbs
});

router.get('/login', function(req, res){
    res.render('login', {success:req.query.success, error: req.flash('error')}); //display login.hbs
});

router.post('/login',
  // This is where authentication happens
  // authentication locally (not using passport-google, passport-twitter, passport-github...)
  passport.authenticate('local', { failureRedirect: 'login', failureFlash:true }),
  function(req, res,next) {
    // res.json(req.user);
    // res.redirect('/users/profile')
    res.redirect('profile'); // Successful. redirect to localhost:3000/users/profile
});

router.get('/logout', function(req, res){
    req.logout();
    // res.redirect('/');
    res.redirect('/index'); // Successful. redirect to localhost:3000/users
});

function loggedIn(req, res, next) {
  if (req.user) {
    next(); // req.user exisit so go to the next function (right after loggedIn)
  } else {
    res.redirect('login'); // user doesn't exisit redirect to localhost:3000/users/login
  }
}

////////////////////////////////////////

function runQuery_profile(req, res, client, done, next) {
  return function(err, result) {
    if(err) {
      console.log("unable to query SELECT");
      console.log(err);
      next(err);
    }
    else {
      console.log(result);
      res.render('profile', {rows: result.rows, user: req.user} );
    }
  };
}

function connectDB_profile(req, res, next) {
  return function(err, client, done) {
    if(err) {
      console.log("Unable to connect to database");
      console.log(err);
      return next(err);
    }
    client.query('SELECT * FROM quizzes WHERE username=$1', [req.user.username], runQuery_profile(req, res, client, done, next));
  };
}

router.get('/profile',loggedIn,function(req, res, next){
      // passport middleware adds user object to HTTP req object
      // passport.authenticate from login (HTTP Post)
      //res.render('profile', { user: req.user }); // display profile.hbs
      pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB_profile(req,res,next));
});

/////////////////////////////////////////////

router.get('/signup',function(req, res) {
    // If logged in, go to profile page
    if(req.user) {
      return res.redirect('profile');
    }
    res.render('signup'); // signup.hbs
});
// check if username has spaces, DB will whine about that
function validUsername(username) {
  var login = username.trim(); // remove spaces
  return login !== '' && login.search(/ /) < 0;
}

function encryptPWD(password){
    var salt = bcrypt.genSaltSync(10);
    //console.log("hash passwords");
    return bcrypt.hashSync(password, salt);
}

function createUser(req, res, client, done, next){
  console.log("create account");
  var pwd = encryptPWD(req.body.password);
  client.query('INSERT INTO users (username, password) VALUES($1, $2)', [req.body.username, pwd], function(err, result) {
    done(); // done all queries
    if (err) {
      console.log("unable to query INSERT");
      return next(err); // throw error to error.hbs. only for test purpose
    }
    console.log("User creation is successful");
    //req.method='get'
    //res.redirect('login', {success: "true"});
    res.redirect('login?success=true');
  });
}

function runQuery(req, res, client, done, next) {
  return function(err, result){
    if (err) {
      console.log("unable to query SELECT ");
      next(err); // throw error to error.hbs. only for test purpose
    }
    else if (result.rows.length > 0) {
      console.log("user exists");
      res.render('signup', { error: "true" });
    }
    else {
      console.log("no user with that name");
      createUser(req, res, client, done, next);
    }
  };
} // client.query

function connectDB(req, res, next) {
  // pg.connect expects callback function has three parameters: err, client, done
  // err is for errors; client is the connection to postgres (query with it), and
  // done is a callback to finish the query
  return function(err, client, done) {
    if (err){ // connection failed
      // response.json(err);
      console.log("Unable to connect to database");
      return next(err);
    }
    client.query('SELECT * FROM users WHERE username=$1',[req.body.username], runQuery(req, res, client, done, next));

  };
}

router.post('/signup', function(req, res, next) {
    // Reject users
    if (!validUsername(req.body.username)) {
      return res.render('signup');
    }

    // Generate a hashed password
    // Connect to the database (error checking)
    // Check if the user exists (error checking)
    // If not, encrypt password (error checking)
    // create a user (error checking)

    pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB(req,res,next));

  });

router.get('/quiz', loggedIn, function(req,res) {
	console.log("Loaded quiz!");
	res.render('quiz', { user: req.user });
});

function connectDB_submitScore(req, res, next) {
  return function(err, client, done) {
    if(err) {
      console.log("Unable to connect to database");
      return next(err);
    }

    client.query('INSERT INTO quizzes (username, score) VALUES($1, $2)', [req.user.username, req.body.finalScore], function(err, result) {
      done();
      if(err) {
        console.log("unable to query INSERT");
        return next(err);
      }
      console.log("Quiz successfully added");
      res.redirect('profile');
    });
  };
}
router.post('/quiz', loggedIn, function(req,res,next) {
  pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB_submitScore(req, res, next));
});

module.exports = router;
