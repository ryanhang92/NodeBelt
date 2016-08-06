'use strict';

let express = require('express');
let validator = require('validator');
let mongoose = require('mongoose');
let app = express();

//Const Declaration
const PORT_NUMBER = 3000;
const ROUTE_BASE = 'localhost:3000';
const HOME_ROUTE = '/';
const INPUT_DATE_ROUTE = '/api/:inputString';
const DATABASE_LOCATION = 'mongodb://localhost/test';
const USER_ERROR_CODE = 400;
const INTERNAL_ERROR_CODE = 500;

//Database Declaration
let Schema = mongoose.Schema;
let requestSchema = new Schema({
  input: String
});
let RequestData = mongoose.model('RequestData', requestSchema);
mongoose.connect(DATABASE_LOCATION);

//TimeStamp Helper Functions
function checkInt(value) {
  return (/^(\-|\+)?([0-9]+)$/.test(value));
};

let isUnixTimeStamp = function(inputString) {
  return checkInt(inputString);
};

let isNaturalDate = function(inputString) {
  let date = new Date(inputString);
  return !(date == 'Invalid Date');
};

//Middleware
function requestSaver(req, res, next) {
  let inputString = req.params.inputString;
  let newRequest = new RequestData({
    input: inputString
  });
  newRequest.save(function(err) {
    if (err) console.log(err);
    console.log('Data was saved!');
    next();
  });
};

function dateValidator(req, res, next) {
  let inputDateString = req.params.inputString;
  if (!inputDateString) {
    return res.status(USER_ERROR_CODE).send({error: 'Input is Null - Try Again'});
  };
  if (!(isUnixTimeStamp(inputString) && isNaturalDate(inputString))) {
    return res.status(USER_ERROR_CODE).send({error: 'Input is not a Unix Nor Natrual Date - Try Again'});
  };
  next();
};

function errorHandler(err, req, res, next) {
  console.log(err.stack);
  res.status(INTERNAL_ERROR_CODE).send(err);
};

//Routes
app.get(HOME_ROUTE, function(req, res) {
  res.send('Head to' + INPUT_DATE_ROUTE + 'to use the api');
});

app.get(INPUT_DATE_ROUTE, requestSaver, dateValidator, function(req, res) {
  let inputString = req.params.inputString;
  if (isUnixTimeStamp(inputString)) {
    let dateObject = new Date(parseInt(inputString));
    let naturalDate = dateObject.toString();
    return res.send({unix: inputString, naturalDate: naturalDate});
  }
  if (isNaturalDate(inputString)) {
    let dateObject = new Date(inputString);
    let unixDate = dateObject.getTime() / 1000;
    return res.send({unix: unixDate, naturalDate: inputString});
  }
  res.status(USER_ERROR_CODE).send({unix: null, naturalDate: null, message: 'Input not Unix nor Natural Date, type not recognized'});
});

app.use(errorHandler);

//App Driver
app.listen(PORT_NUMBER, function() {
  console.log('Visit Timestamp on ' +  ROUTE_BASE);
});
