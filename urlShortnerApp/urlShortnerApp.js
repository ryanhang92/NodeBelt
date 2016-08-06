'use strict';

let express = require('express');
let mongoose = require('mongoose');
let encoder = require('int-encoder');
let validator = require('validator');
let app = express();

//Const
const PORT_NUMBER = 3000;
const ROUTE_BASE = 'localhost:3000';
const HOME_ROUTE = '/';
const CREATE_SHORT_URL_ROUTE = '/api/create/:fullUrl'; 
const VISIT_SHORT_URL_ROUTE = '/api/visit/:shortUrl';
const VISIT_ROUTE_EXTENSION = '/api/visit/';
const DATABASE_LOCATION = 'mongodb://localhost/test';
const HTTP_QUAL_PREFIX = 'http://www.';
const HTTPS_QUAL_PREFIX = 'https://www.';
const WWW_QUAL_PREFIX = 'www.';
const MONGOOSE_CONNECTED_STATUS = 1;
const BASE_16 = 16;
const USER_ERROR_CODE = 400;
const INTERNAL_ERROR_CODE = 500;

//Database
let Schema = mongoose.Schema;
let urlSchema = new Schema({
  fullUrl: String
});
let UrlData = mongoose.model('UrlData', urlSchema);
mongoose.connect(DATABASE_LOCATION);

//Middleware
function dataBaseChecker(req, res, next) {
  if (mongoose.connection.readyState !== MONGOOSE_CONNECTED_STATUS) {
    return res.status(INTERNAL_ERROR_CODE).send({err: 'Database is not connected, application will fail'});
  };
  next();
};

function urlSaver(req, res, next) {
  let inputUrl = req.params.fullUrl;
  let newUrl = new UrlData({
    fullUrl: inputUrl
  });
  newUrl.save(function(err) {
    if (err) console.log('Cannot save input Url for analytics purposes');
    console.log('Url has been saved');
    next(err);
  });
};

function urlValidator(req, res, next) {
  let inputFullUrl = req.params.fullUrl;
  let inputShortUrl = req.params.shortUrl;
  if (inputFullUrl && inputShortUrl) {
    return res.status(USER_ERROR_CODE).send({err: 'Not possible cannot use create and visit at the same time'});
  };
  if (inputFullUrl && validator.isURL(inputFullUrl)) {
    return next();
  };
  if (inputShortUrl) {
    return next();
  };
  console.log(inputFullUrl, inputShortUrl);
  res.status(USER_ERROR_CODE).send({err: 'not a valid Url - Try Again'});
};

function errorHandler(err, req, res, next) {
  console.log(err.stack);
  res.status(INTERNAL_ERROR_CODE).send(err);
};

//Helper Functions
let dbIDtoShortUrl = function(dataBaseIdNumber) {
  let compressedNumber = encoder.encode(dataBaseIdNumber, BASE_16);
  let shortUrl = ROUTE_BASE + VISIT_ROUTE_EXTENSION + compressedNumber.toString();
  return shortUrl;
};

let shortUrlToDBId = function(encodedKey) {
  let dataBaseID = encoder.decode(encodedKey, BASE_16);
  return dataBaseID;
};

let httpQualificationChecker = function(inputFullUrl, eCb) {
  if (inputFullUrl.slice(0, HTTP_QUAL_PREFIX.length) === HTTP_QUAL_PREFIX) {
    return true;
  };
  if (inputFullUrl.slice(0, WWW_QUAL_PREFIX.length) === WWW_QUAL_PREFIX) {
    return true;
  };
  if (inputFullUrl.slice(0, WWW_QUAL_PREFIX.length) === WWW_QUAL_PREFIX) {
    eCb({errorMessage: 'Https Requests not accepted due to security concerns'}, USER_ERROR_CODE);
    return false;
  };
  eCb({errorMessage: 'unknown http qualificaiton pre-fix type with' + inputFullUrl}, USER_ERROR_CODE);
  return false;
};

let httpQualificationModifier = function(inputFullUrl, eCb) {
  if (inputFullUrl.slice(0, HTTP_QUAL_PREFIX.length) === HTTP_QUAL_PREFIX) {
    return inputFullUrl;
  };
  if (inputFullUrl.slice(0, WWW_QUAL_PREFIX.length) === WWW_QUAL_PREFIX) {
    return 'http://' + inputFullUrl;
  };
  eCb({errorMessage: 'Error a non valid http qualification string should not have passed qualiChecker test'}, INTERNAL_ERROR_CODE);
};

app.use(dataBaseChecker);

//Routing
app.get(HOME_ROUTE, function(req, res) {
  res.send('visit /create or /visit to get use the API');
});

app.get(CREATE_SHORT_URL_ROUTE, urlValidator, urlSaver, function(req, res) {
  let eCb = function(err, errCode) {
    if (errCode) {
      return res.status(errCode).send(err);
    };
    return res.status(errCode).send('Unknown Error and error Code');
  };
  let inputUrl = req.params.fullUrl;
  if (!httpQualificationChecker(inputUrl, eCb)) { 
    return res.status(USER_ERROR_CODE).send('Error, Url is incorrectly qualified, it is not www. or http://www.');
  };
  let newUrl = new UrlData({
    fullUrl: httpQualificationModifier(inputUrl, eCb)
  });
  newUrl.save(function(err, urlObject) {
    if (err) return res.status(INTERNAL_ERROR_CODE).send({err: 'Url Failed to Save in the Database, shortened Url cant be generated'});
    console.log('Data was saved');
    let dataBaseID = urlObject._id;
    let shortUrl = dbIDtoShortUrl(dataBaseID);
    res.send({shortUrl: shortUrl});
  });
});

app.get(VISIT_SHORT_URL_ROUTE, urlValidator, function(req, res) {
  let shortUrl = req.params.shortUrl;
  let dataBaseID = shortUrlToDBId(shortUrl);
  UrlData.findById(dataBaseID, function(err, urlData) {
    if (err) return res.status(USER_ERROR_CODE).send('Short Url not found in the database');
    res.redirect(urlData.fullUrl);
  });
});

app.use(errorHandler);

app.listen(PORT_NUMBER, function() {
  console.log('Visit Url Shortner on ' + ROUTE_BASE);
});
