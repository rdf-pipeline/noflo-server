#!/usr/bin/env node
// vim: set filetype=javascript:
var _ = require('underscore');
var Promise = require('promise');
var path = require('path');
var fs = require('fs');
var program = require('commander');
var http = require('http');
var connect = require('connect');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');
var path = require('path');
var noflo = require('noflo');
var runtime = require('noflo-runtime-websocket');
var navigator = require('./navigator');

program
  .option('--host <hostname>', 'Host', String, 'localhost')
  .option('--port <port>', 'Port', Number, 8080)
  .option('--secret <secret>', 'Secret string', String)
  .option('--permissions <permissions>', 'Permissions', String, 'protocol:component,protocol:runtime,protocol:graph,protocol:network,component:getsource,component:setsource')
  .option('--graph <file>', 'FBP graph file', String)
  .option('--output <file>', 'JSON graph file', String)
  .parse(process.argv);

var permissions = {};
var defaultPermissions = program.permissions.split(',');
if (program.secret) {
    permissions[program.secret] = defaultPermissions;
    defaultPermissions = [];
}
var origin = program.host + ':' + program.port;
var suffix = '%26secret%3D' + encodeURIComponent(program.secret);
program.socket = 'ws://' + origin;
program.url = 'http://' + origin + '/';
program.page = 'http://' + origin + '/index.html#runtime/endpoint?protocol%3Dwebsocket%26address%3D' +
    encodeURIComponent(program.socket) + (program.secret ? suffix : '');

var baseDir = path.join(__dirname, '..');

var serve = serveStatic(baseDir);

var server = http.createServer(function(req, res){
    var done = finalhandler(req, res);
    if (req.url == '/') {
        res.statusCode = 302;
        res.setHeader('Location', program.page);
        res.end();
    } else if (req.url.indexOf('/nodes/') !== 0) {
        serve(req, res, done);
    }
});

program.graph = path.resolve(process.cwd(), program.graph || 'output.json');
program.output = path.resolve(process.cwd(), program.output || program.graph.replace(/.fbp$/,'.json'));

Promise.resolve(program.graph).then(function(filename){
    return promiseResult(fs.exists, fs, program.output).then(function(exists){
        if (exists) return program.output;
        else return filename;
    });
}).then(function(filename){
    return promiseResult(fs.exists, fs, filename).then(function(exists){
        if (exists) {
            console.log("Reading graph from", filename);
            return promiseResult(noflo.graph.loadFile, noflo.graph, filename);
        } else return noflo.graph.createGraph(filename);
    });
}).then(function(graph){
    var rt = runtime(server, {
        defaultGraph: graph,
        baseDir: baseDir,
        captureOutput: false,
        catchExceptions: true,
        permissions: permissions,
        defaultPermissions: defaultPermissions
    });
    navigator(server, '/nodes/', rt);
    return rt;
}).then(function(rt){
    return promiseResult(server.listen, server, program.port).then(function(port){
        console.log('NoFlo runtime ' + rt.version + ' listening at ' + program.socket);
        console.log('NoFlo UI is available at ' + program.url);
        console.log('Using ' + baseDir + ' for noflo-ui');
        console.log('Default permissions are ' + rt.getPermitted().join(', '));
        return rt;
    });
}).then(function(rt){
    setInterval(saveGraph(rt), 20000);
    return promiseResult(process.on, process, 'SIGINT').then(saveGraph(rt));
}).then(function(){
    process.exit(0);
}).catch(function(error){
    console.log(error);
    process.exit(1);
});

function promiseError(fn, context /* arguments */) {
    var args = _.toArray(arguments).splice(2);
    return new Promise(function(resolve, reject){
        fn.apply(context, args.concat(function(err){
            if (err) reject(err);
            else resolve();
        }));
    });
}

function promiseResult(fn, context /* arguments */) {
    var args = _.toArray(arguments).splice(2);
    return new Promise(function(resolve, reject){
        fn.apply(context, args.concat(resolve));
    });
}

function saveGraph(rt) {
    return function() { 
        var graph = _.first(_.filter(_.values(rt.graph.graphs), 'nodes'));
        promiseResult(fs.exists, fs, program.output).then(function(exists){
            if (exists) return graph;
        }).then(function(graph) { 
            if (graph) { 
                console.log('Saving graph',program.output);
                return promiseError(fs.writeFile, fs, program.output, JSON.stringify(graph, null, 2));
            }
        });
     };
}

