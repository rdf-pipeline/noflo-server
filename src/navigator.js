// navigator.js

var fs = require('fs');
var path = require('path');
var querystring = require('querystring');
var _ = require('underscore');
var Handlebars = require('handlebars');

Handlebars.registerHelper('toJSON', function(object){
	return new Handlebars.SafeString(JSON.stringify(object, null, 2));
});

Handlebars.registerHelper('encodeURI', function(uri){
    return encodeURI(uri);
});

var index = new Promise(function(done, fail) {;
    fs.readFile(path.resolve(__dirname, '../handlebars/index.html.hbs'), 'utf8', function(err, source) {
        if (err) fail(err);
        else done(source);
    });
}).then(function(source) {
    return Handlebars.compile(source);
});

var render = new Promise(function(done, fail) {;
    fs.readFile(path.resolve(__dirname, '../handlebars/node.html.hbs'), 'utf8', function(err, source) {
        if (err) fail(err);
        else done(source);
    });
}).then(function(source) {
    return Handlebars.compile(source);
});

module.exports = function(server, path, runtime) {
    var network = new Promise(function(found){
        runtime.network.on('addnetwork', function(network) {
            found(network);
        });
    });
    var facades = {};
    _.forEach(_.filter(_.values(runtime.graph.graphs), 'nodes'), function(graph) {
        _.forEach(graph.nodes, function(node){
            var fn = node.metadata.facade;
            node.metadata.facade = function(facade) {
                facades[node.id] = facade;
                if (fn) return fn.apply(this, arguments);
            }
        });
    });
    server.on('request', function(req, res) {
        network.then(function(network){
            if (req.url.indexOf(path) === 0) {
                var start = path.length;
                var len = req.url.length;
                var q = req.url.indexOf('?', start);
                var qs = q > 0 ? req.url.substring(q) : '';
                var end = q > 0 ? q : len;
                var nodeId = decodeURI(req.url.substring(start, end));
                if (nodeId) return render.then(function(render) {
                    return processes(network, facades, render, path, nodeId, qs, res);
                }); else return index.then(function(index) {
                    return listing(network, index, path, qs, res);
                });
            }
        }).catch(function(error){
            res.writeHeade(500, {'Content-Type': 'text/plain'});
            res.end(error.stack ? error.stack : error);
        });
    });
};

function listing(network, index, path, qs, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end(index({
        path: path,
        search: qs,
        name: network.graph.name,
        nodes: network.graph.nodes
    }));
}

function processes(network, facades, render, path, nodeId, qs, res) {
    var vnid = qs ? querystring.parse(qs.substring(1)).vnid : undefined;
    res.setHeader('Content-Type', 'text/html');
    res.end(render({
        path: path,
        search: qs,
        node: _.find(network.graph.nodes, function(node){
            return node.id == nodeId;
        }),
        facade: facades[nodeId],
        vnis: facades[nodeId] && vnid != null ? _.object([vnid], [facades[nodeId].vnis[vnid]]) :
            facades[nodeId] ? facades[nodeId].vnis : undefined,
        initializers: _.filter(network.graph.initializers, function(initializer) {
            return initializer.to.node == nodeId;
        }),
        from: _.filter(network.graph.edges, function(edge) {
            return edge.to.node == nodeId;
        }),
        to: _.filter(network.graph.edges, function(edge) {
            return edge.from.node == nodeId;
        }),
        component: network.processes[nodeId].component
    }));
}
