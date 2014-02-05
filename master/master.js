
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var config = require('./config.js');
var crypto = require('crypto');
var fs = require('fs');

var app = express();

// all environments
app.set('port', config.port || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.bodyParser({
    keepExtensions: false,
    uploadDir: "tmpdata"
}));
app.use(express.methodOverride());
// app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
    res.render('index', {
        siteName: config.siteName
    });
});

app.post('/', function(req, res) {
    // console.log(req.files.uploadfile);

    // hash file with sha256
    var sha256sum = crypto.createHash('sha256');
    var filehash = fs.ReadStream(req.files.uploadfile.path);
    filehash.on('data', function(d) {
        sha256sum.update(d);
    });
    filehash.on('end', function() {
        var d = sha256sum.digest('hex');
        console.log(d + ' ' + req.files.uploadfile.name);
        // move file to storage location
        fs.rename(req.files.uploadfile.path, 'files/' + d, function() {
            // notify clusters to fetch file

            // return client with download path
            res.send(200, config.clusterurl + d);
        });
    });
});

app.post('/syncfile', function(req, res) {
    if (req.body.accesskey != config.clusterkey) {
        return res.send(401);
    } else {
        res.sendfile('files/' + req.body.filehash);
    }
});

// handle 404
app.use(function(req, res) {
    res.send(404, 'My files gone?! :-O');
});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
