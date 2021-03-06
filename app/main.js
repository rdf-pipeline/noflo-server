console.time('noflo-ui-init');
console.time('polymer-ready');

window.addEventListener('polymer-ready', function() {
  var noflo = require('noflo');
  var runtime = require('noflo-runtime-webrtc');

  var baseDir = '/noflo-ui';
  var mainGraph = 'noflo-ui/graphs/main.fbp';

  var loadGraphs = function(callback) {
    noflo.graph.loadJSON(require(mainGraph), function (err, g) {
      g.baseDir = baseDir;
      noflo.createNetwork(g, function (err, n) {
        n.on('process-error', function (err) {
          console.log(err);
        });
        return callback();
      });
    });
  };
  var loadGraphsDebuggable = function(callback) {
    var secret = Math.random().toString(36).substring(7);
    noflo.graph.loadJSON(require(mainGraph), function (err, graph) {
      if (err) {
        console.log(err);
      }
      graph.baseDir = baseDir;
      var runtimeOptions = {
        defaultGraph: graph,
        baseDir: graph.baseDir,
        permissions: {}
      };
      runtimeOptions.permissions[secret] = [
        'protocol:component',
        'protocol:runtime',
        'protocol:graph',
        'protocol:network',
        'component:getsource',
        'component:setsource'
      ];
      var rt = runtime(null, runtimeOptions, true);
      rt.start();
      var ide = 'http://app.flowhub.io';
      var debugUrl = ide+'#runtime/endpoint?'+encodeURIComponent('protocol=webrtc&address='+rt.signaller+'#'+rt.id+'&secret='+secret);
      var debugLink = document.getElementById('flowhub_debug_url');
      if (debugLink) {
        debugLink.href = debugUrl;
      } else {
        console.log(debugUrl);
      }
      rt.network.on('addnetwork', function () {
        return callback();
      });
    });
  };

  console.timeEnd('polymer-ready');
  document.body.classList.remove('loading');
  window.nofloStarted = false;
  console.time('noflo-prepare');
  var load = (true) ? loadGraphsDebuggable : loadGraphs;
  load(function() {
      console.timeEnd('noflo-prepare');
      console.timeEnd('noflo-ui-init');
  });
});
