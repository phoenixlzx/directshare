
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var config = require('./config.js');
var fs = require('fs');
var querystring = require('querystring');

var app = express();

// all environments
app.set('port', config.port || 3000);
app.use(express.favicon());app.use(express.logger('dev'));
app.use(express.json());
app.use(express.methodOverride());
app.use(express.bodyParser());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', function(req, res) {
    res.send(400, 'Bad request');
});

app.get('/:hash', function(req, res) {
    fs.readFile('files/' + req.params.hash + '.json', 'utf8', function(err, filedata) {
        if (err) {
            if (err.code === 'ENOENT') {
                res.send(404, 'File not found. :-(');
            } else {
                console.log(err);
            }
        } else {
            var filedata = JSON.parse(filedata);
            res.download('files/' + req.params.hash, filedata.filename);
        }
    })
});

app.post('/syncfile', function(req, res) {
    if (req.body.clusterkey != config.clusterkey) {
        return res.send(401);
    } else {
        res.send(200);
        var post_data = querystring.stringify({
            clusterkey: config.clusterkey,
            filehash: req.body.filehash
        });

        var post_options = {
            hostname: config.master,
            port: config.masterport,
            path: '/syncfile',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': post_data.length
            }
        }

        // Set up the request
        console.log('Getting file with SHA256 ' + req.body.filehash);
        var post_req = http.request(post_options, function(res) {
            var file = fs.createWriteStream('files/' + req.body.filehash);
            res.pipe(file);
        });

        // post the data
        post_req.write(post_data);
        post_req.end();

        fs.appendFile('files/' + req.body.filehash + '.json', JSON.stringify({
            "filename": req.body.filename
        }), function() {
            console.log('Saved file ' + req.body.filename + ' with hash ' + req.body.filehash);
        });
    }

});

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
