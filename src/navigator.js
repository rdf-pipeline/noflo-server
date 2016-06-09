// navigator.js 

// The navigator takes incoming server page requests and dynamically generates the appropriate 
// Web page.  The Web pages currently supported include: 
//    http://<noflo-server>:<port>/node/
//    http://<noflo-server>:<port>/node/<nodeId>
//
// These pages depend on the handlebar templates to generate the pages: 
//    index.html.hbs - the node page template
//    node.html.hbs - the nodeId page template

var fs = require('fs');

var path = require('path');
var querystring = require('querystring');
var _ = require('underscore');
var Handlebars = require('handlebars');

Handlebars.registerHelper('toJSON', function(object){
    try {
        return new Handlebars.SafeString(JSON.stringify(object, null, 2));
    } catch (e) {
        return new Handlebars.SafeString(e.toString());
    }
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

/**
 * Registers the handle with the server matching request of the given path using
 * the nodes in the given runtime.
 * @see https://github.com/rdf-pipeline/framework/wiki/Noflo-Node-Navigator
 * @param server to register the request event on
 * @param path the path prefix to match the request url to
 * @param runtime the noflo runtime that will contain the noflo network
 */
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
                if (!nodeId) {
                    return index.then(function(index) {
                        return listing(network, facades, index, path, qs, res);
                    });
                } else {
                    var vnid = qs && querystring.parse(qs.substring(1)).vnid;
                    var node = _.find(network.graph.nodes, function(node){
                        return node.id == nodeId;
                    });
                    var vnis = facades[nodeId] && vnid ?
                        _.object([vnid], [facades[nodeId].vnis[vnid]]) :
                        facades[nodeId] ? facades[nodeId].vnis : undefined;
                    if (!qs && !vnis)
                        return redirect('?view', res);
                    else if (!qs)
                        return redirect('?data', res);
                    else if (qs.indexOf('?data') === 0)
                        return data(vnis[vnid || ''], res);
                    else if (qs.indexOf('?output') === 0)
                        return output(vnis[vnid || ''], res);
                    else if (qs.indexOf('?view') === 0)
                        return render.then(function(render) {
                            return view(network, facades, render, path, vnis, vnid, nodeId, qs, res);
                        });
                }
            }
        }).catch(function(error){
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end(error.stack ? error.stack : error);
        });
    });
};

/**
 * Renders the node listing page using the index.html.hbs template.
 *
 * @param network the active network containing the node
 * @param facades hash of RDF pipline component facades
 * @param index page template in hbs
 * @param path the prefix of the URL before the nodeId
 * @param qs query string from the request (including the ?)
 * @param res response object to write to
 */
function listing(network, facades, index, path, qs, res) {
    res.setHeader('Content-Type', 'text/html');

    // Generate a version of the nodes with the profiler summary metrics
    var nodes = [];
    var updateGraphData = [["component name", "ms"]];
    network.graph.nodes.forEach(function(node) { 
        if (! ( _.isEmpty(facades) || _.isUndefined(facades[node.id]))) { 
            var metrics = facades[node.id].profiler.metrics;

            if (!_.isUndefined(metrics.averageUpdateTime)) {
                updateGraphData.push([node.id, metrics.averageUpdateTime]);
            }

            nodes.push(_.defaults({numberOfUpdates: metrics.numberOfUpdates,
                                   averageUpdateTime: metrics.averageUpdateTime + ' ms',
                                   totalProcessingTime: metrics.totalProcessingTime + ' ms'},
                                  node
            ));
        } else {
            nodes.push(_.defaults({numberOfUpdates: "n/a",
                                   averageUpdateTime: "n/a",
                                   totalProcessingTime: "n/a"},
                                  node
            ));
        }
    });

    res.end(index({
        path: path,
        search: qs || '?view',
        name: network.graph.name || 'RDF Pipeline',
        nodes: nodes,
        updateGraphData: updateGraphData
    }));
}

/**
 * Redirects the agent to the target location.
 * @param target target location
 * @param res response object to write to
 */
function redirect(target, res) {
    res.writeHead(303, {'Location': target});
    res.end();
}

/**
 * Writes the outputState data to the agent.
 * @param vni object containing the outputState
 * @param res response object to write to
 */
function data(vni, res) {
    if (vni) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(vni.outputState.data, null, 2));
    } else {
        res.writeHead(404);
        res.end("No output state available");
    }
}

/**
 * Writes the outputState to the agent.
 * @param vni object containing the outputState
 * @param res response object to write to
 */
function output(vni, res) {
    if (vni) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(vni.outputState, null, 2));
    } else {
        res.writeHead(404);
        res.end("No output state available");
    }
}

/**
 * Pretty formats a javascript timestamp for human readability
 */
function timeStamp(date) {
    var date = _.isUndefined(date) ? new Date() : new Date(date);
    return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + (date.getDate() + 1)).slice(-2) + ' ' +
           date.getHours() + ':' + date.getMinutes() + ':' + date.getSeconds() + '\n';
}

/**
 * Generate a node with the profile metrics added to it
 *
 * @param nodes list of all nodes in the pipeline
 * @param facades hash of all facades by nodeId
 * @param nodeId node identifier that should be displayed
 */
function nodeWithProfile(nodes, facades, nodeId) {

    // get the node we want to display
    var node = _.find(nodes, function(node){
            return node.id == nodeId;
    });
    node = node || {};

    // If we have a facade for the node, then add the metrics to the node
    // We will only have a facade if this is an RDF pipeline node
    if (! ( _.isEmpty(facades) || _.isUndefined(facades[nodeId]))) { 

        var metrics = facades[node.id].profiler.metrics;
        return _.defaults({profile:[
                             {"metricName": "Started",
                              "metricValue": timeStamp(metrics.startTime)},
                             {"metricName": "Updates",
                              "metricValue": metrics.numberOfUpdates,
                              "metricDetails": {"Average": metrics.averageUpdateTime + ' ms',
                                                "Total": metrics.totalUpdateTime + ' ms'}},
                             {"metricName": "Events",
                              "metricValue": metrics.numberOfEvents,
                              "metricDetails": {"Average": metrics.averageEventTime + ' ms',
                                                 "Total": metrics.totalEventTime + ' ms'}}, 
                             {"metricName": "Errors",
                              "metricValue": metrics.numberOfErrors,
                              "metricDetails": {"Average": metrics.averageErrorTime + ' ms',
                                                "Total": metrics.totalErrorTime + ' ms'}},
                             {"metricName": "Total Processing Time",
                              "metricValue": metrics.totalProcessingTime + ' ms'}
                          ]},
                          node
        );
    } else {
        // Not an RDF pipeline node - go ahead and just set default n/a values
        return _.defaults({profile:[ 
                              {"metricName": "Started",
                               "metricValue": "n/a"},
                              {"metricName": "Updates",
                               "metricValue": "n/a"},
                              {"metricName": "Events",
                               "metricValue": "n/a"},
                              {"metricName": "Errors",
                               "metricValue": "n/a"}, 
                              {"metricName": "Total Processing Time",
                               "metricValue": "n/a"}
                           ] 
                          },
                          node
        );
    }
}

/**
 * Renders the nodeId view page using the node.html.hbs template
 *
 * @param network the active network containing the node
 * @param facades hash of all facades by nodeId
 * @param render page template in hbs
 * @param path the prefix of the URL before the nodeId
 * @param vnis set of all vni states for this node
 * @param vnid vnid state that should be shown
 * @param nodeId node identifier that should be displayed
 * @param qs query string from the request (including the ?)
 * @param res response object to write to
 */
function view(network, facades, render, path, vnis, vnid, nodeId, qs, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(render({
        path: path,
        search: qs,
        node: nodeWithProfile(network.graph.nodes, facades, nodeId),
        facade: facades[nodeId],
        vnis: vnis,
        vnid: vnid,
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
