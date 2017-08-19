const express = require('express');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const mustacheExpress = require('mustache-express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

// connect to our mongodb and test the connection
let url = 'mongodb://localhost:27017/user-login-project';
MongoClient.connect(url, function(err, db) {
  assert.equal(null, err);
  console.log('=> Connected to MongoDB server.');
  db.close();
});

// create our Express app
let app = express();

// set up our logging using morgan
app.use(morgan('tiny'));
app.use(bodyParser.urlencoded({ extended: false }));

// set up the express-session store to use MongoDB
let store = new mongoDBStore(
  {
    uri: 'mongodb://localhost:27017/user-login-project',
    collection: 'user'
  }
);

store.on('error', (e) => {
  assert.ifError(e);
  assert.ok(false);
});

// set up express-session
app.use(session({
  secret: 'keyboard cat',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 //1 week
  },
  store: store,
  resave: true,
  saveUninitialized: true
}));

// set up our template engine - mustache
app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');


// --------  BEGIN ROUTES  -----------

let pathsThatDoNotRequireAuthentication = [
  '/newaccount',
  '/login'
];

// GENERAL CATCH FOR ALL ROUTES TO CHECK LOGIN STATUS
app.use( (req, res, next) => {
  console.log('*********************************************************');
  console.log('=> ALL ROUTES check session store');
  console.log(`${req.path}`);

  // some paths do not require auth, detect that here and pass on...
  if( pathsThatDoNotRequireAuthentication.indexOf(req.path) >= 0 ) {
    return next();
  }

  // check to see if this user is recognized and logged in
  if( req.session.user ) { console.log(JSON.stringify(req.session.user)); }
  else { console.log('=> no session data available');}

  if( req.session.user && req.session.user.loggedin ) {
    // whatever route the user has requested, they have logged in and are
    // good to go, so we can call next() and find the route they requested
    console.log('=> confirmed session data exists and loggedin as true');
    next();
  } else {
    // user either needs to sign in with credentials or sign up for account
    console.log('=> user is not logged in, render login');
    res.render('login', {error: false});
  }
})

// ROUTES BELOW ASSUME USER HAS EITHER AUTHENTICATED OR WAS PRESENTED WITH LOGIN

app.get('/', (req, res, next) => {
  // if it doesn't exist, assume we have never seen this user before
  if (!req.session.user) {
    console.log('=> req.session.user not available?');
    next('ERROR: user requested root, but req.session.user was not available');
  } else {
    // render the main page and pass the data to display
    res.render('index', {data: req.session.user});
  }
});

app.get('/login', (req, res, next) => {
  // check to see if they have session data
  if( req.session.user && req.session.user.loggedin ) {
    // user is already logged in, so they probably should be on /
    res.redirect('/');
  } else {
    res.render('login');
  }
});

app.post('/login', (req, res, next) => {
  // this is where we will auth a user based on what they entered in the form

  // user has no cookie => no session is available
  // all we have is the database to authenticate against....
  // this query works:
  // db.user.find({"session.user.username":"water"})
  console.log('=> beginning auth verification');
  console.log(`=> BEFORE MongoClient, the value of headersSent: ${res.headersSent}`);

  MongoClient.connect(url, function(err, db) {
    console.log(`=> FIRST LINE OF MONGO CLIENT, the value of headersSent: ${res.headersSent}`);
// db will be initialized db object or null if error occured
    assert.equal(null, err);
    console.log('=> Connected to MongoDB server.');
    console.log('=> User posted login information, querying the db.');
    console.log(`=> Looking for ${req.body.username} with pass: ${req.body.password}`);

    db.collection('user').find({"session.user.username":req.body.username}).toArray( (err, docs) => {
      if(err) {console.log('=> DB ERROR: ' + err);}
      else {
        console.log('  => Retrieved records from db:');
        console.log(docs);
        // check for the username/password combo
        if( docs[0] && (docs[0].session.user.password === req.body.password) ) {
          // password matched
          console.log('=> passwords matched');
          req.session.user = {};
          req.session.user.username = req.body.username;
          req.session.user.password = req.body.password;
          req.session.user.loggedin = true;
          db.close();
          // res.send('password matched! log in successful.');
          res.redirect('/');
        } else {
          console.log('=> passwords did not match');
          db.close();
          // passwords didn't match
          res.render('login', {error: 'passwords did not match'});
        }
      }
    })
  });
})

app.post('/newaccount', (req, res, next) => {
  // grab what they entered and set re.session
  // redirect to / as auth user
  console.log('Create new user: ' + req.body.username + ' ' + req.body.password);
  // we will need to create req.session.user
  req.session.user = {};
  req.session.user.username = req.body.username;
  req.session.user.password = req.body.password;
  req.session.user.loggedin = true;

  // res.render('index', {data: req.session.user});
  res.send('new account created successfully');
})

app.listen(3000, () => {
  console.log('=> listening on 3000.');
})
