var express = require('express');
var router = express.Router();
var passport = require('passport');
var pg = require('pg').native;
var bcrypt = require('bcryptjs');

/* GET users listing. */
router.get('/', function(req, res, next) {
  /*if (req.user){
    res.redirect('/user'); //display user.hbs
  }
  else{*/
    res.render('index');
  //}
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
    console.log(req.user);
    console.log('index.js');
    if (req.user.type == 'content'){
      res.redirect('/content');
    }
    else if (req.user.type == 'ad'){
      res.redirect('/ad');
    }

    else{
      res.redirect('/user');
    }
    //res.redirect('profile'); // Successful. redirect to localhost:3000/users/profile
});
router.get('/logout', function(req, res){
    req.logout();
    // res.redirect('/');
    res.redirect('/'); // Successful. redirect to localhost:3000/users
});

function loggedIn(req, res, next) {
  if (req.user) {
    next(); // req.user exist so go to the next function (right after loggedIn)
  } else {
    res.redirect('login'); // user doesn't exisit redirect to localhost:3000/users/login
  }
}

router.get('/upload',loggedIn,function(req,res) {
	res.render('upload', {user: req.user});
});

router.get('/video',function(req,res){
  res.render('video', {user: req.user});
});

router.get('/catalog',function(req,res, next){
  pg.connect(process.env.DATABASE_URL + "?ssl=true", getCatalog(req,res,next));
});

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
      res.render('profile', {user: req.user} );
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
    client.query('SELECT * FROM users WHERE username=$1', [req.user.username], runQuery_profile(req, res, client, done, next));
  };
}

router.get('/profile',loggedIn,function(req, res, next){
      // passport middleware adds user object to HTTP req object
      // passport.authenticate from login (HTTP Post)
      //res.render('profile', { user: req.user }); // display profile.hbs
      pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB_profile(req,res,next));
});

router.get('/content',loggedIn,function(req, res, next){
      // connect DB and read table assignments
      pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB_content(req,res,next));

});

function connectDB_content(req, res, next) {
  return function(err, client, done) {
    if (err){ // connection failed
      console.log("Unable to connect to database");
      return next(err);
    }
    client.query('SELECT * FROM users WHERE username=$1',[req.user.username], runQuery_content(req, res, client, done, next));
  };
}

function runQuery_content(req, res, client, done, next) {
  return function(err, result){
    if (err) {
      console.log("unable to query SELECT ");
      next(err); // throw error to error.hbs. only for test purpose
    }
    else {
      console.log(result);
      res.render('content', {user: req.user} );
    }
  };
}

router.get('/ad',loggedIn,function(req, res, next){
      // connect DB and read table assignments
      pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB_ad(req,res,next));

});

function connectDB_ad(req, res, next) {
  return function(err, client, done) {
    if (err){ // connection failed
      console.log("Unable to connect to database");
      return next(err);
    }
    client.query('SELECT * FROM users WHERE username=$1',[req.user.username], runQuery_ad(req, res, client, done, next));
  };
}

function runQuery_ad(req, res, client, done, next) {
  return function(err, result){
    if (err) {
      console.log("unable to query SELECT ");
      next(err); // throw error to error.hbs. only for test purpose
    }
    else {
      console.log(result);
      res.render('ad', {user: req.user} );
    }
  };
}

router.get('/user',loggedIn,function(req, res, next){
      // connect DB and read table assignments
      if (req.user.type == 'content'){
        res.redirect('/content');
      }
      else if (req.user.type == 'ad'){
        res.redirect('/ad');
      }

      else{
      pg.connect(process.env.DATABASE_URL + "?ssl=true", connectDB_user(req,res,next));
    }
});

function connectDB_user(req, res, next) {
  return function(err, client, done) {
    if (err){ // connection failed
      console.log("Unable to connect to database");
      return next(err);
    }
    client.query('SELECT * FROM users WHERE username=$1',[req.user.username], runQuery_user(req, res, client, done, next));
  };
}

function runQuery_user(req, res, client, done, next) {
  return function(err, result){
    if (err) {
      console.log("unable to query SELECT ");
      next(err); // throw error to error.hbs. only for test purpose
    }
    else {
      console.log(result);
      res.render('reguser', {user: req.user} );
    }
  };
}
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
  console.log("create account2");
  var pwd = encryptPWD(req.body.password);
console.log(req.body);
console.log(req.body.radio);
  client.query('INSERT INTO users (username, password, type, firstname, lastname, location, birthday) VALUES($1, $2, $3, $4,$5, $6, $7)', [req.body.username, pwd, req.body.radio, req.body.firstname, req.body.lastname, req.body.location, req.body.birthday], function(err, result) {
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

function uploadVideo(req, res, next){
	return function(err, client, done){
		if(err){
			console.log("Unable to connect to database");
			return next(err);
		}

		console.log("Upload video");
		var thisDate = new Date();
    console.log(req.user.username);
    console.log("url with watch: ",req.body.videoURL);
    var url2 = req.body.videoURL;
    var url = url2.replace("watch?v=", "embed/");
    console.log("url without watch: ", url);
		client.query('INSERT INTO videos (videoTitle, author, videoURL, tag1, tag2, tag3, uploadDate) VALUES($1, $2, $3, $4, $5, $6, $7);', [req.body.videoTitle, req.user.username, url, req.body.tag1, req.body.tag2, req.body.tag3, thisDate], function(err,result){
			//done();
			if(err){
				console.log("Unable to query INSERT");
				return next(err);
			}
      else{
      console.log("Video upload successful");
      client.query('SELECT * FROM videos WHERE videoURL=$1',[url],runQuery_video(req, res, client, done, next));
    }
    }
	);//select videourl from videos where author = 'Cpizarro'; where author = $1 [req.user.username]
};
}

function runQuery_video(req, res, client, done, next) {
  return function(err, result){
    if (err) {
      console.log("unable to query SELECT from runQuery_Video ");
      next(err); // throw error to error.hbs. only for test purpose
    }
    else {
      console.log(result);
      console.log("in runQuery_video");

        //result.rows[0]."field name" is used to pull from the results of the form entries of the user
          console.log(result.rows[0].videourl);
          console.log(result.rows[0].videotitle);


      res.render('video', {videourl: result.rows[0].videourl, success:"true", title: result.rows[0].videotitle , user: req.user});
    }
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

  function getCatalog(req, res, next){
    console.log("beg of getCatalog");
    return function(err, client, done){
      if(err){
        console.log("can't query getCatalog");
        return next(err);
      }
      else {
          console.log("in get catalog function");
          console.log(req.user.username);
          if(req.user.type == 'user'){
            client.query('SELECT videourl FROM videos',runCatalog(req, res, client, done, next));
          }
          else{
            client.query('SELECT videourl FROM videos WHERE author=$1',[req.user.username],runCatalog(req, res, client, done, next));
          }
      }
  };
  }

  function runCatalog(req, res, client, done, next){
    return function(err, result){
      if (err) {
        console.log("unable to query SELECT from runCatalog");
        next(err); // throw error to error.hbs. only for test purpose
      }
      else {
        console.log(result);
        console.log("in runCatalog");
        if(result.rows.length !== 0 ){
            console.log(result.rows);
            //console.log(result.rows[0].videotitle);
            var url = result.rows[0].videourl;
            console.log(url);
        res.render('catalog', {videourl: url, success:"true", rows:result.rows, user: req.user});
        }
        else {
          res.render('catalog', {success:"false"});
        }

  }
  };
  }

router.post('/upload', function(req, res, next) {
	pg.connect(process.env.DATABASE_URL + "?ssl=true", uploadVideo(req,res,next));
});

router.post('/catalog', function(req,res,next){
  pg.connect(process.env.DATABASE_URL + "?ssl=true", getCatalog(req,res,next));

});


module.exports = router;
