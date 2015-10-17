/**
 * Created by kevin on 10/16/15.
 */
var express = require('express');
var http = require('http');
var app = express();
app.use('/', express.static('./public', { extensions: ['ts', 'html', 'js'] }));

var port = 3000;

http.createServer(app).listen(port, function(){
    console.log('listening on port', port);
});