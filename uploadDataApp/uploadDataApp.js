'use strict';

let express = require('express');
let mongoose = require('mongoose');
let bodyParser = require('body-parser');
let multer = require('multer');
let upload = multer({ dest: './uploads/'});
let validator = require('validator');
let app = express();

app.use(express.static(__dirname));
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
app.use(bodyParser.json());

//Const
const PORT_NUMBER = 3000;
const ROUTE_BASE = 'localhost:3000';
const HOME_ROUTE = '/';
const UPLOAD_FILE_ROUTE = '/api/upload';
const DATABASE_LOCATION = 'mongodb://localhost/test';
const FILE_STORAGE_LOCATION = './uploads/';
const FILE_SIZE_LIMIT = 10000;
const FILE_TYPE_BLACKLIST = ['.exe'];
const USER_ERROR_CODE = 400;
const INTERNAL_ERROR_CODE = 500;
const VIEW_TEMPLATE_NAME = 'index.html';

//Database code
let Schema = mongoose.Schema;
let FileMetaDataSchema = new Schema({
  mimeType: String,
  fileSize: Number
});
let FileMetaData = mongoose.model('FileMetaData', FileMetaDataSchema);
mongoose.connect(DATABASE_LOCATION);

//Middleware
function uploadChecker(req, res, next) {
  if (FILE_TYPE_BLACKLIST.indexOf(req.file.mimetype) > 0) {
    return res.status(USER_ERROR_CODE).send('Not an okay file type, send it again');
  };
  if (req.file.size > FILE_SIZE_LIMIT) {
    return res.status(USER_ERROR_CODE).send('File Size is too large, try again');
  };
  next();
};

function fileMetaDataLogger(req, res, next) {
  let fileMimeType = req.file.mimetype;
  let fileSize = req.file.size;
  let newFileMetaData = new FileMetaData({
    mimeType: fileMimeType,
    fileSize: fileSize
  });
  newFileMetaData.save(function(err) {
    if (err) console.log('file Meta Data failed to save');
    console.log('file did save');
    next();
  });
};

function errorHandler(err, req, res, next) {
  console.log(err.stack);
  res.status(INTERNAL_ERROR_CODE).send(err);
};

//Routing
app.get('/', function(req, res) {
  res.render(VIEW_TEMPLATE_NAME);
});

app.post(UPLOAD_FILE_ROUTE, multer({dest: FILE_STORAGE_LOCATION}).single('uploadFile'), uploadChecker, fileMetaDataLogger, function(req, res) {
  let fileMimeType = req.file.mimetype;
  let fileSize = req.file.size;
  res.send({fileMimeType: fileMimeType, fileSize: fileSize});
});

app.use(errorHandler);

//App Driver
app.listen(PORT_NUMBER, function() {
  console.log('Find Upload App on ' + ROUTE_BASE);
}); 
