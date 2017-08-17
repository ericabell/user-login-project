const express = require('express');
const session = require('express-session');
const mongoDBStore = require('connect-mongodb-session')(session);
const mustacheExpress = require('mustache-express');

let app = express();


app.get('/', (req, res, next) => {
  res.send('hello');
})

app.listen(3000, () => {
  console.log('listening on 3000.');
})
