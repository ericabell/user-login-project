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

// GENERAL CATCH FOR ALL ROUTES TO CHECK LOGIN STATUS
app.use( (req, res, next) => {
  console.log('=> ALL ROUTES check session store');
  if( req.session.user ) { console.log(JSON.stringify(req.session.user)); }
  else { console.log('=> no session data available');}

  if( req.session.user && req.session.user.loggedin ) {
    // whatever route the user has requested, they have logged in and are
    // good to go, so we can call next() and find the route they requested
    next();
  } else {
    // user either needs to sign in with credentials or sign up for account
    res.render('login');
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
  MongoClient.connect(url, function(err, db) {
    assert.equal(null, err);
    console.log('=> Connected to MongoDB server.');
    console.log('=> User posted login information, querying the db.');
    console.log(`=> Looking for ${req.body.username} with pass: ${req.body.password}`);
    db.user.find({"session.user.username":req.body.username}).toArray( (err, docs) => {
      if(err) {console.log('=> DB ERROR: ' + err);}
      else {
        console.log('  => Retrieved records from db:');
        console.log(docs);
        db.close();
      }
    })

  });
  res.send('need to find the user in the database. no cookie, no session')
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

  res.redirect('/');
})

app.listen(3000, () => {
  console.log('=> listening on 3000.');
})
