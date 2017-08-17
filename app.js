const express = require('express');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const mustacheExpress = require('mustache-express');
const morgan = require('morgan');

let app = express();

app.use(morgan('combined'));

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
  // try to get the data from req.session
  let user = req.session.user;

  // if it doesn't exist, assume we have never seen this user before
  if (!user) {
    console.log('We have never seen this user before.');
    // create some data for the session associated with this user (cookie)
    user = req.session.user = {username: '', password: '', loggedin: false};
    res.redirect('/login');
  } else {
    // we have seen this person before, but are they logged in?
    console.log('We have seen this user before, need to check their status');
    res.render('index', {data: JSON.stringify(user)});
  }

});

app.get('/login', (req, res, next) => {
  res.render('login')
});

app.post('/login', (req, res, next) => {
  res.send('post to login attempted')
})

app.listen(3000, () => {
  console.log('listening on 3000.');
})
