// navigator.js

var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var Handlebars = require('handlebars');

Handlebars.registerHelper('toJSON', function(object){
    console.log("toJSON", object);
	return new Handlebars.SafeString(JSON.stringify(object, null, 2));
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
                var end = q > 0 ? q : len;
                var nodeId = req.url.substring(start, end);
                if (nodeId) return render.then(function(render) {
                    return processes(network, facades, render, nodeId, res);
                }); else return index.then(function(index) {
                    return listing(network, index, res);
                });
            }
        }).catch(function(error){
            res.end(error.stack ? error.stack : error);
        });
    });
};

function listing(network, index, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end(index({
        name: network.graph.name,
        nodes: network.graph.nodes
    }));
}

function processes(network, facades, render, nodeId, res) {
    res.setHeader('Content-Type', 'text/html');
    res.end(render({
        node: _.find(network.graph.nodes, function(node){
            return node.id == nodeId;
        }),
        facade: facades[nodeId],
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
