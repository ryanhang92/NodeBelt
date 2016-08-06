'use strict';

let express = require('express');
let mongoose = require('mongoose');
let app = express();

//Const
const PORT_NUMBER = 3000;
const ROUTE_BASE = 'localhost:3000';
const HOME_ROUTE = '/';
const REQUEST_HEADER_DATA_ROUTE = '/api'; 
const DATABASE_LOCATION = 'mongodb://localhost/test';
const HEADER_DATA_FIELD = 'user-agent';
const INTERNAL_ERROR_CODE = 500;

//Database Code
let Schema = mongoose.Schema;
let VisitorSchema = new Schema({
  hostIP: String
});
let VisitorData = mongoose.model('VisitorData', VisitorSchema);
mongoose.connect(DATABASE_LOCATION);

//Middleware
function visitorLogger(req, res, next) {
  let headerData = req.headers;
  let newVisitor = new VisitorData({ 
    hostIP: headerData.host 
  });
  newVisitor.save(function(err) {
    if (err) console.log(err);
    console.log('Visitor Data was saved!');
    next(); 
  });
};

function errorHandler(err, req, res, next) {
  console.log(err.stack);
  res.status(INTERNAL_ERROR_CODE).send(err);
};

//Routes
app.get(REQUEST_HEADER_DATA_ROUTE, visitorLogger, function(req, res) {
  let headerData = req.headers;
  if (headerData) {
    let ip = headerData.host;
    let hardware = headerData[HEADER_DATA_FIELD];
    return res.send({ip: ip, hardware: hardware});
  };
  res.status(INTERNAL_ERROR_CODE).send({message: 'Header Data was not received'});
});

app.use(errorHandler);

//App Driver
app.listen(PORT_NUMBER, function() {
  console.log('Visit Header Parser on ' + ROUTE_BASE);
});
