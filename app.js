const express = require('express');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const mustacheExpress = require('mustache-express');
const morgan = require('morgan');
const bodyParser = require('body-parser');

let app = express();

app.use(morgan('combined'));
app.use(bodyParser.urlencoded({ extended: false }));

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


// session data structure:
// collection name is user and will hold three things
// 1. this user's current status: logged in or logged out
// 2. this user's username
// 3. this user's password

app.use(session({
  secret: 'keyboard cat',
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 //1 week
  },
  store: store,
  resave: true,
  saveUninitialized: true
}));

app.engine('mustache', mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');


app.get('/', (req, res, next) => {
  // if it doesn't exist, assume we have never seen this user before
  if (!req.session.user) {
    console.log('We have never seen this user before.');
    // create some data for the session associated with this user (cookie)
    res.redirect('/login');
  } else {
    // we have seen this person before, but are they logged in?
    console.log('We have seen this user before, need to check their status');
    if( req.session.user.loggedin ) {
      // user is logged in, we are good.
      res.render('index', {data: JSON.stringify(req.session.user)});
    } else {
      // need to autheticate, send them to /login
      res.redirect('/login');
    }
  }

});

app.post('/', (req, res, next) => {
  // this is where a user has typed some credentials and we need to check them
  res.send('need to check credentials' + req.body.username + req.body.password)

})

app.get('/login', (req, res, next) => {
  res.render('login')
});

app.post('/login', (req, res, next) => {
  // this is where we will auth a user based on what they entered in the form
  let username = req.body.username;
  let password = req.body.password;

  console.log('authenticate user: ' + username + ' ' + password);

  // TODO need to check credentials
  if( username != req.body.username || password != req.body.password ) {
    // auth failed
  } else {
    // auth success! redirect to / as authenticated user
    res.redirect('/');
  }
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
  console.log('listening on 3000.');
})
