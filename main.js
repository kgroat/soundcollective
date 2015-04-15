/*jshint node:true*/
/*jslint node:true*/
var express = require('express');
var app = express();

app.use('/sound', express.static(__dirname+'/sound'));
app.use(express.static(__dirname +'/public'));

var server = app.listen(3000, function () {
    var host = 'localhost',
        port = server.address().port;

    console.log('Example app listening at http://%s:%s', host, port)
});