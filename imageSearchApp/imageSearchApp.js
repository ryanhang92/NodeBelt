'use strict';

let express = require('express');
let mongoose = require('mongoose');
let url = require('url');
let https = require('https');
let app = express();

//Const
const PORT_NUMBER = 3000;
const ROUTE_BASE = 'localhost:3000';
const HOME_ROUTE = '/';
const IMAGE_QUERY_ROUTE = '/api/:searchQuery';
const CUSTOM_SEARCH_API_KEY = 'AIzaSyA-FB4BBrDbMEFkJexmeteBJ9bD-j1tVNE';
const CUSTOM_SEARCH_URI = 'https://www.googleapis.com/customsearch/v1?';
const CUSTOM_SEARCH_CX = '017482243201844965657%3A1cfzf0wj70k';
const DATABASE_LOCATION = 'mongodb://localhost/test';
const QUERY_LIMIT = 10;
const ITEMS_PER_PAGE = 5;
const MAX_PAGE = QUERY_LIMIT / ITEMS_PER_PAGE;
const API_DATA_FIELD = 'items';
const USER_ERROR_CODE = 400;
const INTERNAL_ERROR_CODE = 500;
const NO_ERROR_CODE = 200;

//Database
let Schema = mongoose.Schema;
let ImageQuerySchema = new Schema({
  query: String
});
let ImageQuery = mongoose.model('ImageQuery', ImageQuerySchema);
mongoose.connect(DATABASE_LOCATION);

//Middelware
function queryLogger(req, res, next) {
  let imageSearchQuery = req.params.searchQuery;
  let newImageQuery = new ImageQuery({
    query: imageSearchQuery
  });
  newImageQuery.save(function(err) {
    if (err) console.log('query data failed to save');
    next(err);
  });
};

function errorHandler(err, req, res, next) {
  console.log(err.stack);
  res.status(INTERNAL_ERROR_CODE).send(err);
};

//Routing Helper Functions 
let searchURIConstructor = function(searchApiURI, apiKey, cxCode, query) {
  let apiRequestString = searchApiURI + 'q=' + query + '&cx=' + cxCode + '&key=' + apiKey;
  return apiRequestString;
};

let searchApiResponseIsValidated = function(response) {
  return (response[API_DATA_FIELD]);
};

let requestSearchApi = function(searchApiURI, apiKey, cxCode, query, cb) {
  let searchURI = searchURIConstructor(searchApiURI, apiKey, cxCode, query);
  let callback = function(response) {
    let body = '';
    response.on('error', function(err) {
      cb(err); 
    })
    response.on('data', function(searchApiResponse) {
      body += searchApiResponse;
    })
    response.on('end', function() {
      if (response.statusCode != NO_ERROR_CODE) {
        return cb({statusCode: response.statusCode});
      }
      let parsedresponse = JSON.parse(body);
      cb(null, parsedresponse);
    })
  };
  return https.request(searchURI, callback).end(); 
};

//Routing
app.get(HOME_ROUTE, queryLogger, function(req, res) {
  res.send('Please Visit ' + IMAGE_QUERY_ROUTE + ' to use the API, Pagination can be accessed with the ?offset=#');
});

app.get(IMAGE_QUERY_ROUTE, function(req, res) {
  let searchQuery = req.params.searchQuery;
  let resultPage = url.parse(req.url, true).query.offset;
  if ((resultPage > MAX_PAGE) || (resultPage < 0)) {
    return res.status(USER_ERROR_CODE).send('Page Offset is out of range only offset must be between 1 and ' + MAX_PAGE + ', param of 0 renders all results');
  };
  requestSearchApi(CUSTOM_SEARCH_URI, CUSTOM_SEARCH_API_KEY, CUSTOM_SEARCH_CX, searchQuery, function(err, data) {
    if (err) return res.status(INTERNAL_ERROR_CODE).send('Root API is down the abstraction will fail');
    if (!searchApiResponseIsValidated(data)) { 
      return res.status(INTERNAL_ERROR_CODE).send('Search API Items are not included in the response, critical error');
    };
    let responseArray = [];
    let searchResultArray = data['items'];
    for (let i = 0; i < searchResultArray.length; i++) {
      responseArray.push(searchResultArray[i]['link']);
    };
    if (resultPage > 0) {
      let resultIndexLow = (resultPage - 1) * ITEMS_PER_PAGE;
      let resultIndexHigh = resultIndexLow + ITEMS_PER_PAGE; 
      let paginatedReponse = responseArray.slice(resultIndexLow, resultIndexHigh);
      return res.send(paginatedReponse);
    };
    res.send(responseArray);
  });
});

app.use(errorHandler);

app.listen(PORT_NUMBER, function() {
  console.log('Visit the Image Search App at ' + ROUTE_BASE);
}); 