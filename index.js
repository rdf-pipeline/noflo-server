
      if (navigator.vendor && navigator.vendor.indexOf('Apple') !== -1) {
        console.log('Safari detected, replacing broken IndexedDB with shim');
        window.shimIndexedDB.__useShim();
      }
    ;

  (function () {
    "use strict";

    Polymer('the-graph-thumb', {
      graph: null,
      width: 200,
      height: 150,
      thumbscale: 1,
      nodeSize: 60,
      fillStyle: "hsl(184, 8%, 10%)",
      strokeStyle: "hsl(180, 11%, 70%)",
      lineWidth: 0.75,
      theme: "dark",
      edgeColors: [
        "white",
        "hsl(  0, 100%, 46%)",
        "hsl( 35, 100%, 46%)",
        "hsl( 60, 100%, 46%)",
        "hsl(135, 100%, 46%)",
        "hsl(160, 100%, 46%)",
        "hsl(185, 100%, 46%)",
        "hsl(210, 100%, 46%)",
        "hsl(285, 100%, 46%)",
        "hsl(310, 100%, 46%)",
        "hsl(335, 100%, 46%)"
      ],
      ready: function () {
        this.thumbrectangle = [0,0,500,500];
        this.viewrectangle = [0,0,200,150];
      },
      attached: function () {
        this.style.width = this.width + "px";
        this.style.height = this.height + "px";
        this.themeChanged();
      },
      themeChanged: function () {
        if (this.theme === "dark") {
          this.fillStyle = "hsl(184, 8%, 10%)";
          this.strokeStyle = "hsl(180, 11%, 70%)";
          this.edgeColors = [
            "white",
            "hsl(  0, 100%, 46%)",
            "hsl( 35, 100%, 46%)",
            "hsl( 60, 100%, 46%)",
            "hsl(135, 100%, 46%)",
            "hsl(160, 100%, 46%)",
            "hsl(185, 100%, 46%)",
            "hsl(210, 100%, 46%)",
            "hsl(285, 100%, 46%)",
            "hsl(310, 100%, 46%)",
            "hsl(335, 100%, 46%)"
          ];

        } else {
          // Light
          this.fillStyle = "hsl(184, 8%, 75%)";
          this.strokeStyle = "hsl(180, 11%, 20%)";
          // Tweaked to make thin lines more visible
          this.edgeColors = [
            "hsl(  0,   0%, 50%)",
            "hsl(  0, 100%, 40%)",
            "hsl( 29, 100%, 40%)",
            "hsl( 47, 100%, 40%)",
            "hsl(138, 100%, 40%)",
            "hsl(160,  73%, 50%)",
            "hsl(181, 100%, 40%)",
            "hsl(216, 100%, 40%)",
            "hsl(260, 100%, 40%)",
            "hsl(348, 100%, 50%)",
            "hsl(328, 100%, 40%)"
          ];
        }
        // Redraw
        this.redrawGraph();
      },
      drawEdge: function (context, scale, source, target, route) {
        // Draw path
        try {
          context.strokeStyle = this.edgeColors[0];
          if (route) {
            // Color if route defined
            context.strokeStyle = this.edgeColors[route];
          }
          var fromX = Math.round(source.metadata.x*scale)-0.5;
          var fromY = Math.round(source.metadata.y*scale)-0.5;
          var toX = Math.round(target.metadata.x*scale)-0.5;
          var toY = Math.round(target.metadata.y*scale)-0.5;
          context.beginPath();
          context.moveTo(fromX, fromY);
          context.lineTo(toX, toY);
          context.stroke();
        } catch (error) {
        }
      },
      redrawGraph: function () {
        if (!this.graph || !this.graph.edges.length) {
          return;
        }
        var context = this.$.canvas.getContext("2d");
        if (!context) { 
          // ??? 
          setTimeout( this.redrawGraph.bind(this), 500);
          return; 
        }
        // Need the actual context, not polymer-wrapped one
        context = unwrap(context);

        // Reset origin
        context.setTransform(1,0,0,1,0,0);
        // Clear
        context.clearRect(0, 0, this.width, this.height);
        context.lineWidth = this.lineWidth;
        // Find dimensions
        var toDraw = [];
        var minX = Infinity;
        var minY = Infinity;
        var maxX = -Infinity;
        var maxY = -Infinity;
        var nodes = {};

        // Process nodes
        this.graph.nodes.forEach(function(process){
          if ( process.metadata && !isNaN(process.metadata.x) && !isNaN(process.metadata.y) ) {
            toDraw.push(process);
            nodes[process.id] = process;
            minX = Math.min(minX, process.metadata.x);
            minY = Math.min(minY, process.metadata.y);
            maxX = Math.max(maxX, process.metadata.x);
            maxY = Math.max(maxY, process.metadata.y);
          }
        }.bind(this));

        // Process exported ports
        if (this.graph.inports) {
          Object.keys(this.graph.inports).forEach(function(key){
            var exp = this.graph.inports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              toDraw.push(exp);
              minX = Math.min(minX, exp.metadata.x);
              minY = Math.min(minY, exp.metadata.y);
              maxX = Math.max(maxX, exp.metadata.x);
              maxY = Math.max(maxY, exp.metadata.y);
            }
          }.bind(this));
        }
        if (this.graph.outports) {
          Object.keys(this.graph.outports).forEach(function(key){
            var exp = this.graph.outports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              toDraw.push(exp);
              minX = Math.min(minX, exp.metadata.x);
              minY = Math.min(minY, exp.metadata.y);
              maxX = Math.max(maxX, exp.metadata.x);
              maxY = Math.max(maxY, exp.metadata.y);
            }
          }.bind(this));
        }

        // Sanity check graph size
        if (!isFinite(minX) || !isFinite(minY) || !isFinite(maxX) || !isFinite(maxY) ) {
          return;
        }

        minX -= this.nodeSize;
        minY -= this.nodeSize;
        maxX += this.nodeSize*2;
        maxY += this.nodeSize*2;
        var w = maxX - minX;
        var h = maxY - minY;
        // For the-graph-nav to bind
        this.thumbrectangle[0] = minX;
        this.thumbrectangle[1] = minY;
        this.thumbrectangle[2] = w;
        this.thumbrectangle[3] = h;
        // Scale dimensions
        var scale = (w > h) ? this.width/w : this.height/h;
        this.thumbscale = scale;
        var size = Math.round(this.nodeSize * scale);
        var sizeHalf = size / 2;
        // Translate origin to match
        context.setTransform(1,0,0,1,0-minX*scale,0-minY*scale);

        // Draw connection from inports to nodes
        if (this.graph.inports) {
          Object.keys(this.graph.inports).forEach(function(key){
            var exp = this.graph.inports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              var target = nodes[exp.process];
              if (!target) {
                return;
              }
              this.drawEdge(context, scale, exp, target, 2);
            }
          }.bind(this));
        }
        // Draw connection from nodes to outports
        if (this.graph.outports) {
          Object.keys(this.graph.outports).forEach(function(key){
            var exp = this.graph.outports[key];
            if ( exp.metadata && !isNaN(exp.metadata.x) && !isNaN(exp.metadata.y) ) {
              var source = nodes[exp.process];
              if (!source) {
                return;
              }
              this.drawEdge(context, scale, source, exp, 5);
            }
          }.bind(this));
        }

        // Draw edges
        this.graph.edges.forEach(function (connection){
          var source = nodes[connection.from.node];
          var target = nodes[connection.to.node];
          if (!source || !target) {
            return;
          }
          this.drawEdge(context, scale, source, target, connection.metadata.route);
        }.bind(this));

        // Draw nodes
        toDraw.forEach(function (node){
          var x = Math.round(node.metadata.x * scale);
          var y = Math.round(node.metadata.y * scale);

          // Outer circle
          context.strokeStyle = this.strokeStyle;
          context.fillStyle = this.fillStyle;
          context.beginPath();
          if (node.process && !node.component) {
            context.arc(x, y, sizeHalf / 2, 0, 2*Math.PI, false);
          } else {
            context.arc(x, y, sizeHalf, 0, 2*Math.PI, false);
          }
          context.fill();
          context.stroke();

          // Inner circle
          context.beginPath();
          var smallRadius = Math.max(sizeHalf-1.5, 1);
          if (node.process && !node.component) {
            // Exported port
            context.arc(x, y, smallRadius / 2, 0, 2*Math.PI, false);
          } else {
            // Regular node
            context.arc(x, y, smallRadius, 0, 2*Math.PI, false);
          }
          context.fill();

        }.bind(this));

      },
      listener: null,
      graphChanged: function (oldGraph, newGraph) {
        if (!this.listener) {
          this.listener = this.redrawGraph.bind(this);
        }
        if (oldGraph) {
          oldGraph.removeListener('endTransaction', this.listener);
        }
        if (!this.graph) {
          return;
        }
        this.graph.on('endTransaction', this.listener);
        this.redrawGraph();
      },
      widthChanged: function () {
        this.style.width = this.width + "px";
        this.redrawGraph();
      },
      heightChanged: function () {
        this.style.height = this.height + "px";
        this.redrawGraph();
      },
      toDataURL: function () {
        return this.$.canvas.toDataURL();
      }
    });

  })();
  ;

    (function() {
      Polymer('noflo-add-runtime', {
        name: '',
        address: 'localhost',
        port: '3569',
        secret: '',
        canCreate: false,
        type: '',
        observe: {
          name: 'validate',
          address: 'validate',
          port: 'validate',
          type: 'validate',
        },
        availableTypes: [
          '',
          'custom',
          'noflo-nodejs',
          'microflo',
          'javafbp',
          'imgflo',
          'sndflo',
          'msgflo'
        ],
        attached: function () {
          document.getElementById('container').classList.add('blur');
        },
        detached: function () {
          document.getElementById('container').classList.remove('blur');
        },
        bgClick: function (event) {
          // Don't close if clicking within container
          event.stopPropagation();
        },
        validate: function (oldValue, newValue) {
          if (this.name && this.address && this.port && this.type) {
            this.canCreate = true;
          }
        },
        close: function () {
          if (!this.parentNode) {
            return;
          }
          this.parentNode.removeChild(this);
        },
        createUUID: function () {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
              var r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
              return v.toString(16);
              });
        },
        create: function (event) {
          if (event) {
            event.preventDefault();
          }
          runtime = {
            name: this.name,
            label: this.name,
            id: this.createUUID(),
            type: this.type,
            seen: new Date().toString(),
            protocol: 'websocket',
            address: 'ws://'+ this.address + ':' + this.port,
            description: '',
            secret: this.secret,
            icon: 'cloud'
          };
          this.fire("new", runtime);
          this.close();
        }
      });
    })();
  ;

    Polymer('noflo-type-selector', {
      type: 'noflo-nodejs',
      available: [],
      runtimes: [],
      runtimesChanged: function () {
        this.available = [
          {
            id: 'all',
            label: 'Multi-platform',
            icon: 'asterisk',
            runtimes: []
          }
        ];
        this.runtimes.forEach(function (rt) {
          if (!rt.type) {
            return;
          }
          var availType = this.getByType(rt.type);
          availType.runtimes.push(rt);
        }.bind(this));
      },
      selectType: function (event, details, sender) {
        this.type = sender.getAttribute('data-id');
      },
      getByType: function (type) {
        for (var i = 0; i < this.available.length; i++) {
          if (this.available[i].id === type) {
            return this.available[i];
          }
        }
        return this.prepareAvailable(type);
      },
      prepareAvailable: function (type) {
        var label;
        var icon;
        switch (type) {
          case 'noflo-browser':
            label = 'Browser';
            icon = 'html5';
            break;
          case 'noflo-nodejs':
            label = 'Node.js';
            icon = 'cloud';
            break;
          case 'noflo-gnome':
            label = 'GNOME';
            icon = 'desktop';
            break;
          case 'microflo':
            label = 'Microcontroller';
            icon = 'lightbulb-o';
            break;
          case 'javafbp':
            label = 'Java';
            icon = 'android';
            break;
          case 'imgflo':
            label = 'Image Manipulation';
            icon = 'picture-o';
            break;
          case 'sndflo':
            label = 'Sound synthesis';
            icon = 'music';
            break;
          case 'msgflo':
            label = 'Message Queuing';
            icon = 'cubes';
            break;
          default:
            label = type;
            icon = 'cogs';
        }
        var availType = {
          id: type,
          label: label,
          icon: icon,
          runtimes: []
        };
        this.available.push(availType);
        return availType;
      }
    });
  ;

    Polymer('noflo-new-project', {
      projectId: '',
      name: '',
      type: 'noflo-browser',
      runtimes: null,
      projects: null,
      canSend: false,
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        this.projectId = this.name.toLowerCase().replace(/[\s\/\._]/g, '-').replace('--', '-').replace(/[^a-z0-9\-]/g, '');
        var duplicates = [];
        if (this.projects) {
          duplicates = this.projects.filter(function (project) {
            if (project.id === this.projectId || project.name == this.name) {
              return true;
            }
            return false;
          }.bind(this));
        }
        if (this.name && this.projectId && !duplicates.length) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name || !this.projectId) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newProject');
        }
        this.fire('new', {
          id: this.projectId.replace(/[\/\s\.]/g, '-'),
          name: this.name,
          type: this.type,
          graphs: [],
          components: [],
          specs: []
        });
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-anonymous', {
      theme: 'dark',
      help: null,
      runtime: null,
      userRuntimes: [],
      attached: function () {
        document.body.classList.add(this.theme);
      },
      themeChanged: function (oldTheme, newTheme) {
        this.fire('theme', this.theme);
        document.body.classList.remove(oldTheme);
        document.body.classList.add(newTheme);
      },
    });
  ;

    Polymer('noflo-account-settings', {
      user: null,
      statusText: '',
      requestLogin: false,
      newPlan: '',
      theme: '',
      gridToken: '',
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      checkFlowhubUser: function (callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
          if (req.readyState !== 4) {
            return;
          }
          if (req.status !== 200) {
            return callback(new Error(req.responseText));
          }
          callback(null, JSON.parse(req.responseText));
        };
        req.open('GET', 'https://api.flowhub.io/user', true);
        req.setRequestHeader('Authorization', 'Bearer ' + this.gridToken);
        req.send(null);
      },
      checkGithubUser: function (token, callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
          if (req.readyState !== 4) {
            return;
          }
          if (req.status !== 200) {
            return callback(new Error(req.responseText));
          }
          callback(null, req.getResponseHeader('X-OAuth-Scopes').split(', '));
        };
        req.open('GET', 'https://api.github.com/user?' + Date.now(), true);
        req.setRequestHeader('Authorization', 'token ' + token);
        req.send(null);
      },
      checkPlan: function (event) {
        event.preventDefault();
        event.stopPropagation();
        this.$.refresh.classList.add('fa-spin');
        this.checkFlowhubUser(function (err, user) {
          if (err) {
            this.statusText = 'Failed to fetch Flowhub user information, please re-login';
            this.requestLogin = true;
            this.$.refresh.classList.remove('fa-spin');
            return;
          }
          this.newPlan = user.plan.type;
          if (this.newPlan !== this.plan) {
            this.statusText = 'Your Flowhub plan has been changed to ' + this.newPlan + ', please re-login';
            this.requestLogin = true;
            return;
          }
          if (!user.github || !user.github.token) {
            if (user.plan.type !== 'free') {
              this.statusText = 'Your GitHub token doesn\'t have private repository access, please re-login';
              this.requestLogin = true;
              return;
            }
            this.statusText = 'Your GitHub token doesn\'t have repository access, please re-login';
            this.requestLogin = true;
            return;
          }
          this.checkGithubUser(user.github.token, function (err, scopes) {
            console.log(this.newPlan, scopes);
            this.$.refresh.classList.remove('fa-spin');
            if (err) {
              this.statusText = 'Failed to fetch GitHub user information, please re-login';
              this.requestLogin = true;
              return;
            }
            if (user.plan.type === 'free' && (scopes.indexOf('public_repo') === -1 && scopes.indexOf('repo') === -1)) {
              this.statusText = 'Your GitHub token doesn\'t have repository access, please re-login';
              this.requestLogin = true;
              return;
            }
            if (user.plan.type !== 'free' && scopes.indexOf('repo') === -1) {
              this.statusText = 'Your GitHub token doesn\'t have private repository access, please re-login';
              this.requestLogin = true;
              return;
            }
            this.statusText = 'Everything up to date';
            this.requestLogin = false;
          }.bind(this));
        }.bind(this));
      },
      relogin: function (event) {
        event.preventDefault();
        event.stopPropagation();
        this.fire('relogin', this.newPlan);
      },
      send: function (event) {
        event.preventDefault();
        event.stopPropagation();
        this.fire('updated', {
          theme: this.theme
        });
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    (function () {
      var storage = {
        set: function (key, value, callback) {
          localStorage.setItem(key, value);
          if (callback) {
            callback();
          }
        },
        get: function (key, callback) {
          callback(localStorage.getItem(key));
        },
        remove: function (key) {
          localStorage.removeItem(key);
        }
      };
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Chrome App, use their storage API
        storage.set = function (key, value, callback) {
          var values = {};
          values[key] = value;
          chrome.storage.sync.set(values, callback);
        };
        storage.get = function (key, callback) {
          chrome.storage.sync.get(key, function (items) {
            callback(items[key]);
          });
        };
        storage.remove = function (key) {
          chrome.storage.sync.remove(key);
        };
      }

      Polymer('noflo-account', {
        user: null,
        plan: 'free',
        gridToken: '',
        githubToken: '',
        avatar: '',
        theme: 'dark',
        help: null,
        runtime: null,
        login: function () {
          this.fire('login', true);
        },
        logout: function () {
          this.fire('logout', true);
        },
        attached: function () {
          storage.get('flowhub-theme', function (definedTheme) {
            if (!definedTheme) {
              return;
            }
            this.theme = definedTheme;
          }.bind(this));
          document.body.classList.add(this.theme);
        },
        openSettings: function () {
          if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
            return;
          }
          var dialog = document.createElement('noflo-account-settings');
          dialog.gridToken = this.gridToken;
          dialog.theme = this.theme;
          dialog.plan = this.plan;
          dialog.user = this.user;
          document.body.appendChild(dialog);
          dialog.addEventListener('updated', function (event) {
            this.theme = event.detail.theme;
            storage.set('flowhub-theme', this.theme, function () {});
          }.bind(this));
          dialog.addEventListener('relogin', function (event) {
            event.stopPropagation();
            this.fire('relogin', event.detail);
          }.bind(this));
        },
        themeChanged: function (oldTheme, newTheme) {
          this.fire('theme', this.theme);
          document.body.classList.remove(oldTheme);
          document.body.classList.add(newTheme);
        }
      });
    })();
  ;

    Polymer('noflo-new-repository', {
      token: '',
      errorText: '',
      repo: '',
      canSend: false,
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      repoChanged: function () {
        this.canSend = false;
        if (this.repo && typeof this.repo === 'string') {
          var matched = this.repo.match(/^(git@github\.com:|https:\/\/github\.com\/)?(\S+\/\S+?(?=\.git|$))(\.git)?$/);
          if (!matched || !matched[2]) {
            return;
          }
          if (matched[2] !== this.repo) {
            this.repo = matched[2];
          }
          this.canSend = true;
        }
      },
      createProject: function (callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
          if (req.readyState !== 4) {
            return;
          }
          if (req.status !== 200 && req.status !== 201) {
            return callback(req.responseText);
          }
          return callback(null);
        };
        var payload = JSON.stringify({
          repo: this.repo,
          active: false
        });
        req.open('POST', 'https://api.flowhub.io/projects', true);
        req.setRequestHeader('Authorization', 'Bearer ' + this.token);
        req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        req.send(payload);
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.repo) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newRepository');
        }
        this.errorText = '';
        this.createProject(function (err) {
          if (err) {
            this.errorText = err;
            return;
          }
          this.fire('new', this.repo);
          this.close();
        }.bind(this));
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-new-runtime', {
      runtimes: [
        {
          name: 'noflo-nodejs',
          label: 'NoFlo on Node.js',
          description: 'Building network applications',
          icon: 'cloud',
          url: 'https://github.com/noflo/noflo-nodejs#readme'
        },
        {
          name: 'noflo-gnome',
          label: 'NoFlo on GNOME',
          description: 'Desktop application development',
          icon: 'desktop',
          url: 'https://github.com/noflo/noflo-gnome#readme'
        },
        {
          name: 'microflo',
          label: 'MicroFlo',
          description: 'Microcontroller programming',
          icon: 'lightbulb-o',
          url: 'https://github.com/jonnor/microflo#readme'
        },
        {
          name: 'javafbp',
          label: 'JavaFBP',
          description: 'Java and Android programming',
          icon: 'android',
          url: 'https://github.com/jonnor/javafbp-runtime#readme'
        },
        {
          name: 'imgflo',
          label: 'ImgFlo',
          description: 'Image Manipulation',
          icon: 'picture-o',
          url: 'https://github.com/jonnor/imgflo#readme'
        },
        {
          name: 'sndflo',
          label: 'sndflo',
          description: 'Sound synthesis',
          icon: 'music',
          url: 'https://github.com/jonnor/sndflo#readme'
        },
        {
          name: 'msgflo',
          label: 'msgflo',
          description: 'Message queue orchestration',
          icon: 'cubes',
          url: 'https://github.com/the-grid/msgflo#readme'
        }
      ],
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      },
      addRuntime: function (event) {
        event.preventDefault();
        this.runtimeAdd = document.createElement('noflo-add-runtime');
        document.body.appendChild(this.runtimeAdd);
        this.runtimeAdd.addEventListener('new', function(event) {
            this.fire("addRuntime", event.detail);
        }.bind(this));
      }
    });
  ;

    Polymer('noflo-main', {
      open: true,
      projects: [],
      localProjects: [],
      remoteProjects: [],
      runtimes: [],
      userRuntimes: [],
      examples: [
        {
          label: 'Photo booth',
          id: '7804187'
        },
        {
          label: 'Animated clock',
          id: '7135158'
        },
        {
          label: 'Cam to palette',
          id: '3c0ffdf17195649a2d57'
        },
        {
          label: 'Canvas pattern',
          id: '1319c76fe006fb34c9c9'
        },
        {
          label: 'Yin-yang',
          id: 'a1096a406131e109f836'
        },
        {
          label: 'Delaunay masks',
          id: 'f6d1141de2833e45fb3c'
        },
        {
          label: 'React TODO list',
          id: '1d42f66f5cc4614df935'
        },
        {
          label: 'Web Audio',
          id: '04847249319d2326fa92'
        }
      ],
      githubToken: '',
      gridToken: '',
      user: null,
      avatar: '',
      plan: '',
      projectList: 'local',
      languages: [
        'HTML',
        'JavaScript',
        'CoffeeScript',
        'C++'
      ],
      registry: null,
      registryUrl: 'https://api.flowhub.io',
      help: null,
      attached: function () {
        this.openChanged();
        this.$.mainaccount.addEventListener('login', function (event) {
          this.fetchRuntimes();
        }.bind(this));
        this.$.mainaccount.addEventListener('relogin', function (event) {
          event.stopPropagation();
          this.fire('relogin', event.detail);
        }.bind(this));
        this.$.mainaccount.addEventListener('theme', function (event) {
          window.setTimeout(function () {
            this.fire('theme', event.detail);
          }.bind(this), 1000);
        }.bind(this));
        this.registry = require('flowhub-registry');
        this.help = document.querySelector('noflo-help');

        // Hide projects if not logged in
        this.gridTokenChanged();
      },
      openChanged: function () {
        if (String(this.open) === 'true') {
          // Make main visible
          this.style.height = '100%';
          // Update runtime registry every time we go to the main view
          this.fetchRuntimes();
          return;
        }
        this.style.height = '0px';
      },
      openLocal: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        this.projectList = 'local';
      },
      openGithub: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (!this.gridToken) {
          return;
        }
        event.preventDefault();
        this.projectList = 'github';
        if (this.remoteProjects.length === 0) {
          setTimeout(function () {
            this.fetchGithub();
          }.bind(this), 1);
        }
      },
      deleteProject: function (event, details, sender) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'deleteProject');
        }
        var id = sender.getAttribute('data-id');
        var matches = this.projects.filter(function (proj) {
          if (proj.id === id) {
            return true;
          }
          return false;
        });
        if (!matches.length) {
          return;
        }
        this.fire('deleteProject', matches[0]);
      },
      downloadProject: function (event, details, sender) {
        event.preventDefault();
        event.stopPropagation();
        if (!this.githubToken) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'pullGithub');
        }
        var repo = sender.getAttribute('data-repo');
        var repoParts = repo.split('/');
        var repoId = repoParts[1];
        var dupes = this.projects.filter(function (proj) {
          if (proj.id === repoId) {
            return true;
          }
          return false;
        });
        if (dupes.length) {
          repoId = repo.replace('/', '_');
        }
        var project = {
          id: repoId,
          name: repo,
          repo: repo,
          graphs: [],
          components: [],
          specs: []
        };
        this.fire('downloadProject', {
          project: project,
          token: this.githubToken
        });
        this.openLocal();
      },
      fetchGithub: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.githubToken || !this.gridToken) {
          return;
        }
        this.fire('fetchRemote', this.gridToken);
      },
      githubProjects: function (projects) {
        this.remoteProjects = [];
        projects.forEach(function (remoteProject) {
          for (var i = 0; i < this.localProjects.length; i++) {
            if (this.localProjects[i].repo === remoteProject.repo) {
              // We already have this project checked out
              return;
            }
          }
          this.remoteProjects.push(remoteProject);
        }.bind(this));
      },
      projectsChanged: function () {
        this.projects.forEach(this.checkProject.bind(this));
      },
      runtimesChanged: function () {
        this.runtimes.forEach(this.checkRuntimeSeen.bind(this));
      },
      checkRuntimeSeen: function (runtime) {
        if (!runtime.seen) {
          if (runtime.protocol === 'iframe' || runtime.protocol === 'microflo') {
            runtime.seen = Date.now();
          } else {
            // Non-persistent runtime, don't show
            return;
          }
        }
        runtime.seenHoursAgo = Math.floor((Date.now() - new Date(runtime.seen).getTime()) / (60*60*1000));
        if ((runtime.seenHoursAgo / 24) > 31) {
          // We haven't seen this runtime in over a month, don't show it
          return;
        }
        if (this.userRuntimes.indexOf(runtime) === -1) {
          this.userRuntimes.push(runtime);
        }
      },
      fetchRuntimes: function (event) {
        this.fetchFlowhub();
      },
      fetchFlowhub: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.gridToken) {
          return;
        }
        var button = this.$.fetchruntimes;
        button.classList.add('fa-spin');
        this.registry.list(this.gridToken, {
          host: this.registryUrl
        },function (err, runtimes) {
          button.classList.remove('fa-spin');
          if (err) {
            return;
          }
          var found = [];
          runtimes.forEach(function (runtimeObject) {
            var inStore = null;
            // Flowhub registry API returns an object which contains the actual info we want
            var runtime = runtimeObject.runtime;
            if (runtime.protocol === 'iframe' || runtime.protocol == 'microflo') {
              return;
            }
            this.runtimes.forEach(function (storedRuntime) {
              if (storedRuntime.id === runtime.id) {
                inStore = storedRuntime;
                found.push(inStore.id);
              }
            });
            if (!inStore) {
              this.runtimes.push(runtime);
              this.fire('runtime', runtime);
              this.checkRuntimeSeen(runtime);
              return;
            }

            // Update existing
            var changed = false;
            Object.keys(runtime).forEach(function (attr) {
              if (inStore[attr] === runtime[attr]) {
                return;
              }
              inStore[attr] = runtime[attr];
              changed = true;
            });
            if (changed) {
              this.fire('runtime', inStore);
            }
          }.bind(this));

          // Remove deleted runtimes
          this.userRuntimes.forEach(function (runtime, index) {
            if (found.indexOf(runtime.id) !== -1) {
              return;
            }
            if (runtime.protocol === 'iframe' || runtime.protocol == 'microflo') {
              return;
            }
            this.fire('removedruntime', runtime);
            this.userRuntimes.splice(index, 1);
          }.bind(this));
        }.bind(this));
      },
      gridTokenChanged: function () {
        // Hide projects if not logged in
        // Done like this instead of template if so this.$.fetchruntimes etc work
        if (this.gridToken) {
          this.$.loginrequired.style.display = 'block';
          if (typeof chrome !== 'undefined' && chrome.storage) {
            this.$.loginrequiredChrome.style.display = 'block';
          }
        } else {
          this.$.loginrequired.style.display = 'none';
          if (typeof chrome !== 'undefined' && chrome.storage) {
            this.$.loginrequiredChrome.style.display = 'none';
          }
        }
        this.$.mainaccount.gridToken = this.gridToken;
        setTimeout(this.fetchFlowhub.bind(this), 100);
      },
      openProject: function (event, details, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var project = null;
        this.localProjects.forEach(function (p) {
          if (p.id === sender.getAttribute('data-id')) {
            project = p;
          }
        });
        if (!project) {
          return;
        }
        if (!project.main) {
          if (!project.components.length) {
            return;
          }
          window.location.hash = '#project/' + encodeURIComponent(project.id) + '/component/' + encodeURIComponent(project.components[0].name);
          return;
        }
        window.location.hash = '#project/' + encodeURIComponent(project.id) + '/' + encodeURIComponent(project.main);
      },
      openRuntime: function (event, details, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (sender.getAttribute('data-protocol') === 'iframe') {
          return;
        }
        window.location.hash = '#runtime/' + sender.getAttribute('data-id');
      },
      openExample: function (event, details, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        window.location.hash = '#example/' + sender.getAttribute('data-id');
      },
      newProject: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-project');
        dialog.projects = this.projects;
        dialog.runtimes = this.runtimes;
        document.body.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          var noflo = require('noflo');
          var graph = new noflo.Graph('main');
          var graphId = event.detail.id + '/main';
          graph.setProperties({
            id: graphId,
            project: event.detail.id,
            environment: {
              type: event.detail.type
            }
          });
          event.detail.main = graphId;
          this.fire('newgraph', graph);
          this.fire('newproject', event.detail);
          event.detail.graphs.push(graph);
          this.checkProject(event.detail);
        }.bind(this));
      },
      newRepository: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-repository');
        dialog.token = this.gridToken;
        dialog.addEventListener('new', function (event) {
          this.fetchGithub();
        }.bind(this));
        document.body.appendChild(dialog);
      },
      newRuntime: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-runtime');
        dialog.addEventListener('addRuntime', function(event) {
          var runtime = event.detail;
          this.userRuntimes.push(runtime);
          this.runtimes.push(runtime);
        }.bind(this));
        dialog.user = this.user;
        document.body.appendChild(dialog);
      },
      addRuntime: function (event) {
        event.preventDefault(); 
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        this.runtimeAdd = document.createElement('noflo-add-runtime');
        document.body.appendChild(this.runtimeAdd);
        this.runtimeAdd.addEventListener('new', function(event) {
          var runtime = event.detail;
          this.userRuntimes.push(runtime);
          this.runtimes.push(runtime);
        }.bind(this));
      },
      checkProject: function (project) {
        if (project.main) {
          var mainFound = false;
          project.graphs.forEach(function (graph) {
            if (graph.properties.id === project.main) {
              mainFound = true;
            }
          });
          if (!mainFound) {
            project.main = null;
          }
        }
        if (!project.main) {
          if (!project.graphs.length) {
            // No graphs, wait for them to arrive from GitHub
            var observer = new ArrayObserver(project.graphs);
            observer.open(function () {
              observer.close();
              setTimeout(function () {
                this.checkProject(project);
              }.bind(this), 5);
            }.bind(this));
          }
          // Find a suitable main graph
          project.graphs.forEach(function (graph) {
            if (graph.name === 'main') {
              project.main = graph.properties.id;
            }
          });
          if (!project.main && project.graphs.length) {
            project.main = project.graphs[0].properties.id;
          }
        }
        if (this.localProjects.indexOf(project) === -1) {
          this.localProjects.push(project);
          this.localProjects.sort(function(a, b) {
            return a.name.localeCompare(b.name);
          });
        }
      },
      graphs: function (graph) {
        if (!graph.properties.project) {
          // TODO: Create a project for old-style sketches
          return;
        }
        this.localProjects.forEach(function (project) {
          if (!project.graphs) {
            project.graphs = [];
          }
          if (!project.components) {
            project.components = [];
          }
          if (!project.specs) {
            project.specs = [];
          }
          if (graph.properties.project !== project.id) {
            return;
          }
          if (!project.main) {
            project.mainGraph = graph;
            project.main = graph.properties.id;
          }
          if (graph.properties.id === project.main) {
            project.mainGraph = graph;
          }
          for (var i = 0; i < project.graphs.length; i++) {
            if (project.graphs[i].properties.id === graph.properties.id) {
              // We already have this graph in the project
              return;
            }
          }
          project.graphs.push(graph);
        });
      },
      components: function (component) {
        this.localProjects.forEach(function (project) {
          if (!project.components) {
            project.components = [];
          }
          if (component.project !== project.id) {
            return;
          }
          for (var i = 0; i < project.components.length; i++) {
            if (project.components[i].id === component.id) {
              project.components[i] = component;
              return;
            }
          }
          project.components.push(component);
        });
      }
    });
  ;

  (function(){
    "use strict";

    Polymer('the-graph', {
      graph: null,
      library: null,
      menus: null,
      width: 800,
      height: 600,
      scale: 1,
      appView: null,
      graphView: null,
      editable: true,
      autolayout: false,
      grid: 72,
      snap: 36,
      theme: "dark",
      selectedNodes: [],
      selectedNodesHash: {},
      errorNodes: {},
      selectedEdges: [],
      animatedEdges: [],
      autolayouter: null,
      displaySelectionGroup: true,
      forceSelection: false,
      offsetY: null,
      offsetX: null,
      created: function () {
        this.library = {};
        // Default pan
        this.pan = [0,0];
        // Initializes the autolayouter
        this.autolayouter = klayNoflo.init({
          onSuccess: this.applyAutolayout.bind(this),
          workerScript: "../bower_components/klayjs/klay.js"
        });
      },
      ready: function () {
        this.themeChanged();
      },
      themeChanged: function () {
        this.$.svgcontainer.className = "the-graph-"+this.theme;
      },
      graphChanged: function (oldGraph, newGraph) {
        if (oldGraph && oldGraph.removeListener) {
          oldGraph.removeListener("endTransaction", this.fireChanged);
        }
        // Listen for graph changes
        this.graph.on("endTransaction", this.fireChanged.bind(this));

        // Listen for autolayout changes
        if (this.autolayout) {
          this.graph.on('addNode', this.triggerAutolayout.bind(this));
          this.graph.on('removeNode', this.triggerAutolayout.bind(this));
          this.graph.on('addInport', this.triggerAutolayout.bind(this));
          this.graph.on('removeInport', this.triggerAutolayout.bind(this));
          this.graph.on('addOutport', this.triggerAutolayout.bind(this));
          this.graph.on('removeOutport', this.triggerAutolayout.bind(this));
          this.graph.on('addEdge', this.triggerAutolayout.bind(this));
          this.graph.on('removeEdge', this.triggerAutolayout.bind(this));
        }

        if (this.appView) {
          // Remove previous instance
          React.unmountComponentAtNode(this.$.svgcontainer);
        }

        // Setup app
        this.$.svgcontainer.innerHTML = "";
        this.appView = React.render(
          window.TheGraph.App({
            graph: this.graph,
            width: this.width,
            height: this.height,
            library: this.library,
            menus: this.menus,
            editable: this.editable,
            onEdgeSelection: this.onEdgeSelection.bind(this),
            onNodeSelection: this.onNodeSelection.bind(this),
            onPanScale: this.onPanScale.bind(this),
            getMenuDef: this.getMenuDef,
            displaySelectionGroup: this.displaySelectionGroup,
            forceSelection: this.forceSelection,
            offsetY: this.offsetY,
            offsetX: this.offsetX
          }),
          this.$.svgcontainer
        );
        this.graphView = this.appView.refs.graph;
      },
      onPanScale: function (x, y, scale) {
        this.pan[0] = x;
        this.pan[1] = y;
        this.scale = scale;
      },
      onEdgeSelection: function (itemKey, item, toggle) {
        if (itemKey === undefined) {
          if (this.selectedEdges.length>0) {
            this.selectedEdges = [];
          }
          this.fire('edges', this.selectedEdges);
          return;
        }
        if (toggle) {
          var index = this.selectedEdges.indexOf(item);
          var isSelected = (index !== -1);
          var shallowClone = this.selectedEdges.slice();
          if (isSelected) {
            shallowClone.splice(index, 1);
            this.selectedEdges = shallowClone;
          } else {
            shallowClone.push(item);
            this.selectedEdges = shallowClone;
          }
        } else {
          this.selectedEdges = [item];
        }
        this.fire('edges', this.selectedEdges);
      },
      onNodeSelection: function (itemKey, item, toggle) {
        if (itemKey === undefined) {
          this.selectedNodes = [];
        } else if (toggle) {
          var index = this.selectedNodes.indexOf(item);
          var isSelected = (index !== -1);
          if (isSelected) {
            this.selectedNodes.splice(index, 1);
          } else {
            this.selectedNodes.push(item);
          }
        } else {
          this.selectedNodes = [item];
        }
        this.fire('nodes', this.selectedNodes);
      },
      selectedNodesChanged: function () {
        var selectedNodesHash = {};
        for (var i=0, len = this.selectedNodes.length; i<len; i++) {
          selectedNodesHash[this.selectedNodes[i].id] = true;
        }
        this.selectedNodesHash = selectedNodesHash;
        this.fire('nodes', this.selectedNodes);
      },
      selectedNodesHashChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setSelectedNodes(this.selectedNodesHash);
      },
      errorNodesChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setErrorNodes(this.errorNodes);
      },
      selectedEdgesChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setSelectedEdges(this.selectedEdges);
        this.fire('edges', this.selectedEdges);
      },
      animatedEdgesChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setAnimatedEdges(this.animatedEdges);
      },
      fireChanged: function (event) {
        this.fire("changed", this);
      },
      autolayoutChanged: function () {
        if (!this.graph) { return; }
        // Only listen to changes that affect layout
        if (this.autolayout) {
          this.graph.on('addNode', this.triggerAutolayout.bind(this));
          this.graph.on('removeNode', this.triggerAutolayout.bind(this));
          this.graph.on('addInport', this.triggerAutolayout.bind(this));
          this.graph.on('removeInport', this.triggerAutolayout.bind(this));
          this.graph.on('addOutport', this.triggerAutolayout.bind(this));
          this.graph.on('removeOutport', this.triggerAutolayout.bind(this));
          this.graph.on('addEdge', this.triggerAutolayout.bind(this));
          this.graph.on('removeEdge', this.triggerAutolayout.bind(this));
        } else {
          this.graph.removeListener('addNode', this.triggerAutolayout);
          this.graph.removeListener('removeNode', this.triggerAutolayout);
          this.graph.removeListener('addInport', this.triggerAutolayout);
          this.graph.removeListener('removeInport', this.triggerAutolayout);
          this.graph.removeListener('addOutport', this.triggerAutolayout);
          this.graph.removeListener('removeOutport', this.triggerAutolayout);
          this.graph.removeListener('addEdge', this.triggerAutolayout);
          this.graph.removeListener('removeEdge', this.triggerAutolayout);
        }
      },
      triggerAutolayout: function (event) {
        var graph = this.graph;
        var portInfo = this.graphView ? this.graphView.portInfo : null;
        // Calls the autolayouter
        this.autolayouter.layout({
          "graph": graph,
          "portInfo": portInfo,
          "direction": "RIGHT",
          "options": {
            "intCoordinates": true,
            "algorithm": "de.cau.cs.kieler.klay.layered",
            "layoutHierarchy": true,
            "spacing": 36,
            "borderSpacing": 20,
            "edgeSpacingFactor": 0.2,
            "inLayerSpacingFactor": 2.0,
            "nodePlace": "BRANDES_KOEPF",
            "nodeLayering": "NETWORK_SIMPLEX",
            "edgeRouting": "POLYLINE",
            "crossMin": "LAYER_SWEEP",
            "direction": "RIGHT"
          }
        });
      },
      applyAutolayout: function (layoutedKGraph) {
        this.graph.startTransaction("autolayout");

        // Update original graph nodes with the new coordinates from KIELER graph
        var children = layoutedKGraph.children.slice();

        var i, len;
        for (i=0, len = children.length; i<len; i++) {
          var klayNode = children[i];
          var nofloNode = this.graph.getNode(klayNode.id);

          // Encode nodes inside groups
          if (klayNode.children) {
            var klayChildren = klayNode.children;
            var idx;
            for (idx in klayChildren) {
              var klayChild = klayChildren[idx];
              if (klayChild.id) {
                this.graph.setNodeMetadata(klayChild.id, {
                  x: Math.round((klayNode.x + klayChild.x)/this.snap)*this.snap,
                  y: Math.round((klayNode.y + klayChild.y)/this.snap)*this.snap
                });
              }
            }
          }

          // Encode nodes outside groups
          if (nofloNode) {
            this.graph.setNodeMetadata(klayNode.id, {
              x: Math.round(klayNode.x/this.snap)*this.snap,
              y: Math.round(klayNode.y/this.snap)*this.snap
            });
          } else {
            // Find inport or outport
            var idSplit = klayNode.id.split(":::");
            var expDirection = idSplit[0];
            var expKey = idSplit[1];
            if (expDirection==="inport" && this.graph.inports[expKey]) {
              this.graph.setInportMetadata(expKey, {
                x: Math.round(klayNode.x/this.snap)*this.snap,
                y: Math.round(klayNode.y/this.snap)*this.snap
              });
            } else if (expDirection==="outport" && this.graph.outports[expKey]) {
              this.graph.setOutportMetadata(expKey, {
                x: Math.round(klayNode.x/this.snap)*this.snap,
                y: Math.round(klayNode.y/this.snap)*this.snap
              });
            }
          }
        }
  
        this.graph.endTransaction("autolayout");

        // Fit to window
        this.triggerFit();

      },
      triggerFit: function () {
        if (this.appView) {
          this.appView.triggerFit();
        }
      },
      widthChanged: function () {
        if (!this.appView) { return; }
        this.appView.setState({
          width: this.width
        });
      },
      heightChanged: function () {
        if (!this.appView) { return; }
        this.appView.setState({
          height: this.height
        });
      },
      updateIcon: function (nodeId, icon) {
        if (!this.graphView) { return; }
        this.graphView.updateIcon(nodeId, icon);
      },
      rerender: function (options) {
        // This is throttled with rAF internally
        if (!this.graphView) { return; }
        this.graphView.markDirty(options);
      },
      addNode: function (id, component, metadata) {
        if (!this.graph) { return; }
        this.graph.addNode(id, component, metadata);
      },
      getPan: function () {
        if (!this.appView) { 
          return [0, 0]; 
        }
        return [this.appView.state.x, this.appView.state.y];
      },
      panChanged: function () {
        // Send pan back to React
        if (!this.appView) { return; }
        this.appView.setState({
          x: this.pan[0],
          y: this.pan[1]
        });
      },
      getScale: function () {
        if (!this.appView) { 
          return 1; 
        }
        return this.appView.state.scale;
      },
      displaySelectionGroupChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setState({
          displaySelectionGroup: this.displaySelectionGroup
        });
      },
      forceSelectionChanged: function () {
        if (!this.graphView) { return; }
        this.graphView.setState({
          forceSelection: this.forceSelection
        });
      },
      focusNode: function (node) {
        this.appView.focusNode(node);
      },
      menusChanged: function () {
        // Only if the object itself changes, 
        // otherwise builds menu from reference every time menu shown
        if (!this.appView) { return; }
        this.appView.setProps({menus: this.menus});
      },
      debounceLibraryRefeshTimer: null,
      debounceLibraryRefesh: function () {
        // Breaking the "no debounce" rule, this fixes #76 for subgraphs
        if (this.debounceLibraryRefeshTimer) {
          clearTimeout(this.debounceLibraryRefeshTimer);
        }
        this.debounceLibraryRefeshTimer = setTimeout(function () {
          this.rerender({libraryDirty:true});
        }.bind(this), 200);
      },
      mergeComponentDefinition: function (component, definition) {
        // In cases where a component / subgraph ports change, 
        // we don't want the connections hanging in middle of node
        // TODO visually indicate that port is a ghost
        if (component === definition) {
          return definition;
        }
        var _i, _j, _len, _len1, exists;
        var cInports = component.inports;
        var dInports = definition.inports;

        if (cInports !== dInports) {
          for (_i = 0, _len = cInports.length; _i < _len; _i++) {
            var cInport = cInports[_i];
            exists = false;
            for (_j = 0, _len1 = dInports.length; _j < _len1; _j++) {
              var dInport = dInports[_j];
              if (cInport.name === dInport.name) {
                exists = true;
              }
            }
            if (!exists) {
              dInports.push(cInport);
            }
          }
        }

        var cOutports = component.outports;
        var dOutports = definition.outports;

        if (cOutports !== dOutports) {
          for (_i = 0, _len = cOutports.length; _i < _len; _i++) {
            var cOutport = cOutports[_i];
            exists = false;
            for (_j = 0, _len1 = dOutports.length; _j < _len1; _j++) {
              var dOutport = dOutports[_j];
              if (cOutport.name === dOutport.name) {
                exists = true;
              }
            }
            if (!exists) {
              dOutports.push(cOutport);
            }
          }
        }

        // we should use the icon from the library
        definition.icon = component.icon;
        // a component could also define a svg icon
        definition.iconsvg = component.iconsvg;

        return definition;
      },
      registerComponent: function (definition, generated) {
        var component = this.library[definition.name];
        var def = definition;
        if (component) {
          def = this.mergeComponentDefinition(component, definition);
        }
        this.library[definition.name] = def;
        // So changes are rendered
        this.debounceLibraryRefesh();
      },
      getComponent: function (name) {
        return this.library[name];
      },
      toJSON: function () {
        if (!this.graph) { return {}; }
        return this.graph.toJSON();
      }
    });

  })();
  ;

  (function () {
    "use strict";

    Polymer('the-graph-editor', {
      graph: null,
      grid: 72,
      snap: 36,
      width: 800,
      height: 600,
      scale: 1,
      plugins: {},
      nofloGraph: null,
      menus: null,
      autolayout: false,
      theme: "dark",
      selectedNodes: [],
      copyNodes: [],
      errorNodes: {},
      selectedEdges: [],
      animatedEdges: [],
      displaySelectionGroup: true,
      forceSelection: false,
      created: function () {
        this.pan = [0,0];
        var pasteAction = function (graph, itemKey, item) {
          var pasted = TheGraph.Clipboard.paste(graph);
          this.selectedNodes = pasted.nodes;
          this.selectedEdges = [];
        }.bind(this);
        var pasteMenu = {
          icon: "paste",
          iconLabel: "paste",
          action: pasteAction
        };
        // Default context menu defs
        this.menus = {
          main: {
            icon: "sitemap",
            e4: pasteMenu
          },
          edge: {
            icon: "long-arrow-right",
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeEdge(item.from.node, item.from.port, item.to.node, item.to.port);
                // Remove selection
                var newSelection = [];
                for (var i=0, len=this.selectedEdges.length; i<len; i++){
                  var selected = this.selectedEdges[i];
                  if (selected !== item) {
                    newSelection.push(selected);
                  }
                }
                this.selectedEdges = newSelection;
              }.bind(this)
            }
          },
          node: {
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeNode(itemKey);
                // Remove selection
                var newSelection = [];
                for (var i=0, len=this.selectedNodes.length; i<len; i++){
                  var selected = this.selectedNodes[i];
                  if (selected !== item) {
                    newSelection.push(selected);
                  }
                }
                this.selectedNodes = newSelection;
              }.bind(this)
            },
            w4: {
              icon: "copy",
              iconLabel: "copy",
              action: function (graph, itemKey, item) {
                TheGraph.Clipboard.copy(graph, [itemKey]);
              }
            }
          },
          nodeInport: {
            w4: {
              icon: "sign-in",
              iconLabel: "export",
              action: function (graph, itemKey, item) {
                var pub = item.port;
                if (pub === 'start') {
                  pub = 'start1';
                }
                if (pub === 'graph') {
                  pub = 'graph1';
                }
                var count = 0;
                // Make sure public is unique
                while (graph.inports[pub]) {
                  count++;
                  pub = item.port + count;
                }
                var priNode = graph.getNode(item.process);
                var metadata = {x:priNode.metadata.x-144, y:priNode.metadata.y};
                graph.addInport(pub, item.process, item.port, metadata);
              }
            }
          },
          nodeOutport: {
            e4: {
              icon: "sign-out",
              iconLabel: "export",
              action: function (graph, itemKey, item) {
                var pub = item.port;
                var count = 0;
                // Make sure public is unique
                while (graph.outports[pub]) {
                  count++;
                  pub = item.port + count;
                } 
                var priNode = graph.getNode(item.process);
                var metadata = {x:priNode.metadata.x+144, y:priNode.metadata.y};
                graph.addOutport(pub, item.process, item.port, metadata);
              }
            }
          },
          graphInport: {
            icon: "sign-in",
            iconColor: 2,
            n4: {
              label: "inport"
            },
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeInport(itemKey);
              }
            }
          },
          graphOutport: {
            icon: "sign-out",
            iconColor: 5,
            n4: {
              label: "outport"
            },
            s4: {
              icon: "trash-o",
              iconLabel: "delete",
              action: function (graph, itemKey, item) {
                graph.removeOutport(itemKey);
              }
            }
          },
          group: {
            icon: "th",
            s4: {
              icon: "trash-o",
              iconLabel: "ungroup",
              action: function (graph, itemKey, item) {
                graph.removeGroup(itemKey);
              }
            },
            // TODO copy group?
            e4: pasteMenu
          },
          selection: {
            icon: "th",
            w4: {
              icon: "copy",
              iconLabel: "copy",
              action: function (graph, itemKey, item) {
                TheGraph.Clipboard.copy(graph, item.nodes);
              }
            },
            e4: pasteMenu
          }
        };
      },
      ready: function () {},
      attached: function () {
      },
      detached: function () {
        for (var name in this.plugins) {
          this.plugins[name].unregister(this);
          delete this.plugins[name];
        }
      },
      addPlugin: function (name, plugin) {
        this.plugins[name] = plugin;
        plugin.register(this);
      },
      addMenu: function (type, options) {
        // options: icon, label
        this.menus[type] = options;
      },
      addMenuCallback: function (type, callback) {
        if (!this.menus[type]) {
          return;
        }
        this.menus[type].callback = callback;
      },
      addMenuAction: function (type, direction, options) {
        if (!this.menus[type]) {
          this.menus[type] = {};
        }
        var menu = this.menus[type];
        menu[direction] = options;
      },
      getMenuDef: function (options) {
        // Options: type, graph, itemKey, item
        if (options.type && this.menus[options.type]) {
          var defaultMenu = this.menus[options.type];
          if (defaultMenu.callback) {
            return defaultMenu.callback(defaultMenu, options);
          }
          return defaultMenu;
        }
        return null;
      },
      widthChanged: function () {
        this.style.width = this.width + "px";
      },
      heightChanged: function () {
        this.style.height = this.height + "px";
      },
      graphChanged: function () {
        if (typeof this.graph.addNode === 'function') {
          this.buildInitialLibrary(this.graph);
          this.nofloGraph = this.graph;
          return;
        }

        var noflo;
        if ('noflo' in window) {
          noflo = window.noflo;
        }
        if (!noflo && 'require' in window) {
          noflo = require('noflo');
        }
        if (!noflo) {
          console.warn('Missing noflo dependency! Should be built with Component.io or Browserify to require it.');
          return;
        }

        noflo.graph.loadJSON(this.graph, function(nofloGraph){
          this.buildInitialLibrary(nofloGraph);
          this.nofloGraph = nofloGraph;
        }.bind(this));
      },
      buildInitialLibrary: function (nofloGraph) {
        /*if (Object.keys(this.$.graph.library).length !== 0) {
          // We already have a library, skip
          // TODO what about loading a new graph? Are we making a new editor?
          return;
        }*/

        nofloGraph.nodes.forEach(function (node) {
          var component = {
            name: node.component,
            icon: 'cog',
            description: '',
            inports: [],
            outports: []
          };

          Object.keys(nofloGraph.inports).forEach(function (pub) {
            var exported = nofloGraph.inports[pub];
            if (exported.process === node.id) {
              for (var i = 0; i < component.inports.length; i++) {
                if (component.inports[i].name === exported.port) {
                  return;
                }
              }
              component.inports.push({
                name: exported.port,
                type: 'all'
              });
            }
          });
          Object.keys(nofloGraph.outports).forEach(function (pub) {
            var exported = nofloGraph.outports[pub];
            if (exported.process === node.id) {
              for (var i = 0; i < component.outports.length; i++) {
                if (component.outports[i].name === exported.port) {
                  return;
                }
              }
              component.outports.push({
                name: exported.port,
                type: 'all'
              });
            }
          });
          nofloGraph.initializers.forEach(function (iip) {
            if (iip.to.node === node.id) {
              for (var i = 0; i < component.inports.length; i++) {
                if (component.inports[i].name === iip.to.port) {
                  return;
                }
              }
              component.inports.push({
                name: iip.to.port,
                type: 'all'
              });
            }
          });

          nofloGraph.edges.forEach(function (edge) {
            var i;
            if (edge.from.node === node.id) {
              for (i = 0; i < component.outports.length; i++) {
                if (component.outports[i].name === edge.from.port) {
                  return;
                }
              }
              component.outports.push({
                name: edge.from.port,
                type: 'all'
              });
            }
            if (edge.to.node === node.id) {
              for (i = 0; i < component.inports.length; i++) {
                if (component.inports[i].name === edge.to.port) {
                  return;
                }
              }
              component.inports.push({
                name: edge.to.port,
                type: 'all'
              });
            }
          });
          this.registerComponent(component, true);
        }.bind(this));
      },
      registerComponent: function (definition, generated) {
        this.$.graph.registerComponent(definition, generated);
      },
      libraryRefresh: function () {
        this.$.graph.debounceLibraryRefesh();
      },
      updateIcon: function (nodeId, icon) {
        this.$.graph.updateIcon(nodeId, icon);
      },
      rerender: function () {
        this.$.graph.rerender();
      },
      triggerAutolayout: function () {
        this.$.graph.triggerAutolayout();
      },
      triggerFit: function () {
        this.$.graph.triggerFit();
      },
      animateEdge: function (edge) {
        // Make sure unique
        var index = this.animatedEdges.indexOf(edge);
        if (index === -1) {
          this.animatedEdges.push(edge);
        }
      },
      unanimateEdge: function (edge) {
        var index = this.animatedEdges.indexOf(edge);
        if (index >= 0) {
          this.animatedEdges.splice(index, 1);
        }
      },
      addErrorNode: function (id) {
        this.errorNodes[id] = true;
        this.updateErrorNodes();
      },
      removeErrorNode: function (id) {
        this.errorNodes[id] = false;
        this.updateErrorNodes();
      },
      clearErrorNodes: function () {
        this.errorNodes = {};
        this.updateErrorNodes();
      },
      updateErrorNodes: function () {
        this.$.graph.errorNodesChanged();
      },
      focusNode: function (node) {
        this.$.graph.focusNode(node);
      },
      getComponent: function (name) {
        return this.$.graph.getComponent(name);
      },
      getLibrary: function () {
        return this.$.graph.library;
      },
      toJSON: function () {
        return this.nofloGraph.toJSON();
      }
    });

  })();
  ;

    Polymer('noflo-library', {
      _search: null,
      editor: null,
      graphs: [],
      project: null,
      addNode: function (component) {
        var componentName = component.name;
        var num = 60466176; // 36^5
        num = Math.floor(Math.random() * num);
        var id = componentName + '_' + num.toString(36);

        // TODO fix with pan
        var pan = this.editor.$.graph.getPan();
        var scale = this.editor.$.graph.getScale();

        var graph = this.editor.graph;

        graph.startTransaction('addnode');

        var nameParts = componentName.split('/');
        graph.addNode(id, componentName, {
          label: nameParts[nameParts.length - 1],
          x: (-pan[0] + 334) / scale,
          y: (-pan[1] + 100) / scale
        });

        // Add IIPs for default values
        component.inports.forEach( function (port) {
          var value = port.default;
          if (value !== undefined) {
            graph.addInitial(value, id, port.name);
          }
        });

        graph.endTransaction('addnode');
      },
      search: function (obj) {
        this._search = obj;
        if (!this._search) {
          return;
        }
        if (typeof this._search.search !== 'string') {
          return;
        }
        if (!this.editor) {
          return;
        }
        var library = this.editor.getLibrary();
        if (!library) {
          return;
        }
        Object.keys(library).forEach(function (name) {
          var match = false;
          var component = this.editor.getComponent(name);
          if (this._search.search === '') {
            // Empty search, all components match
            match = true;
          } else {
            if (name.toLowerCase().indexOf(this._search.search.toLowerCase()) !== -1) {
              // Component name matches
              match = true;
            }
            if (typeof component.description === 'string' && component.description.toLowerCase().indexOf(this._search.search.toLowerCase()) !== -1) {
              // Component description matches
              match = true;
            }
          }
          if (!match) {
            return;
          }
          if (component.subgraph && this.project) {
            var nameParts = component.name.split('/');
            if (nameParts[0] === this.project.id) {
              for (var i = 0; i < this.graphs.length; i++) {
                if (this.graphs[i].name === nameParts[1] || this.graphs[i].properties.id === nameParts[1]) {
                  // Prevent circular dependencies
                  return;
                }
              }
            }
          }
          this.fire('result', {
            label: component.name,
            icon: component.icon || 'cog',
            description: component.description,
            action: function () {
              this.addNode(component);
            }.bind(this)
          });
        }.bind(this));
      }
    });
  ;

    Polymer('number-scrubber', {
      value: undefined,
      startValue: 0,
      min: -Infinity,
      max: Infinity,
      mod: 0,
      step: 1,
      distance: 5,
      precision: 1000000,
      scrubstart: null,
      scrubend: null,
      onTrackStart: function (event) {
        // Don't select
        document.body.style.webkitUserSelect = 'none';
        document.body.style.MozUserSelect = 'none';
        document.body.style.msUserSelect = 'none';
        document.body.style.userSelect = 'none';

        document.body.style.cursor = 'ew-resize';

        this.fire("scrubstart");
        if (this.value === undefined) { return; }
        this.value = parseFloat(this.value);
        this.startValue = this.value;
      },
      onTrack: function (event) {
        if (this.value === undefined) { return; }
        var lastValue = this.value;

        var delta = event.dx;

        if (this.distance > 1) {
          delta = Math.round( delta / this.distance );
        }
        if (this.step !== 1) {
          if (this.step > 1) {
            delta = Math.round( delta / this.step ) * this.step;
          } else if (this.step > 0) {
            delta *= this.step;
          }
        }

        var newValue = this.startValue + delta;

        if (this.mod !== 0) {
          newValue %= this.mod;
        }
        if (isFinite(this.min)) {
          newValue = Math.max(newValue, this.min);
        }
        if (isFinite(this.max)) {
          newValue = Math.min(newValue, this.max);
        }

        // Stupid JS numbers
        if (this.precision > 1) {
          newValue = Math.round( newValue * this.precision ) / this.precision;
        }

        if (this.value !== newValue) {
          this.value = newValue;
          this.fire("scrub", this.value);
        }
      },
      onTrackEnd: function (event) {
        // Reset select
        document.body.style.webkitUserSelect = 'auto';
        document.body.style.MozUserSelect = 'auto';
        document.body.style.msUserSelect = 'auto';
        document.body.style.userSelect = 'auto';

        document.body.style.cursor = 'auto';

        this.fire("scrubend");
      }
    });
  ;

    Polymer('noflo-node-inspector', {
      errorLog: null,
      lastErrorLog: 0,
      showErrorLogs: 20,
      label: '',
      node: null,
      component: null,
      graph: null,
      inports: [],
      nodeChanged: function() {
        this.updatePorts();
        this.label = this.node.metadata.label;
      },
      checkUpdateLabel: function (event, detail, sender) {
        if (event.keyCode===13) { // Enter
          event.preventDefault();
          this.updateLabel(event, detail, sender);
        }
      },
      updateLabel: function (event, detail, sender) {
        // Check if we need to make change
        var label = sender.textContent;
        if (label === this.node.metadata.label) {
          return;
        }
        // Change label
        this.graph.startTransaction('rename');
        this.graph.setNodeMetadata(this.node.id, {
          label: label
        });
        // Change id
        var id = label;
        if (id !== this.node.id) {
          // Ensure unique
          while (this.graph.getNode(id)) {
            var num = 60466176; // 36^5
            num = Math.floor(Math.random() * num);
            id = label + '_' + num.toString(36);
          }
          this.graph.renameNode(this.node.id, id);
        }
        this.graph.endTransaction('rename');
      },
      getPortValue: function (port) {
        var value;
        this.graph.initializers.forEach(function (iip) {
          if (iip.to.node == this.node.id && iip.to.port === port) {
            value = iip.from.data;
          }
        }.bind(this));
        return value;
      },
      getPortConnection: function (port) {
        var connected = false;
        var route = "X";
        Object.keys(this.graph.inports).forEach(function (name) {
          var inport = this.graph.inports[name];
          if (inport.process == this.node.id && inport.port == port) {
            connected = true;
            route = 2;
          }
        }.bind(this));
        this.graph.edges.forEach(function (edge) {
          if (edge.to.node == this.node.id && edge.to.port == port) {
            connected = true;
            route = edge.metadata.route || 0;
          }
        }.bind(this));
        return {
          connected: connected,
          route: route
        };
      },
      portToInput: function (port) {
        var value = this.getPortValue(port.name);
        var connection = this.getPortConnection(port.name);
        var portDef = {
          name: port.name,
          label: port.name.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2.$4'),
          class: '',
          type: port.type,
          description: port.description,
          inputType: port.type,
          value: value,
          values: port.values,
          route: connection.route
        };
        switch (port.type) {
          case 'object':
          case 'array':
            portDef.value = JSON.stringify(value);
            portDef.inputType = 'text';
            break;
          case 'int':
            portDef.inputType = 'number';
            break;
          case 'all':
            portDef.inputType = 'text';
            break;
        }
        return portDef;
      },
      inputToPort: function (input) {
        var dataType = input.getAttribute('data-type');
        switch (dataType) {
          case 'object':
          case 'array':
            try {
              return JSON.parse(input.value);
            } catch (e) {
              return input.value;
            }
            break;
          case 'boolean':
            return input.checked;
          case 'number':
            return parseFloat(input.value);
          case 'int':
            return parseInt(input.value, 10);
          case 'date':
            return new Date(input.value);
          case 'uri':
            return function(callback) {
                var reader = new FileReader();
                reader.onload = function() {
                    return callback(reader.result);
                };
                reader.readAsDataURL(input.files[0]);
            };
          default:
            return input.value;
        }
      },
      updatePorts: function () {
        this.inports = [];
        this.component.inports.forEach(function (port) {
          var portDef = this.portToInput(port);
          this.inports.push(portDef);
        }.bind(this));
      },
      checkEnter: function (event, detail, sender) {
        if (event.keyCode===13) {
          event.preventDefault();
          this.updateValue(event, detail, sender);
        }
      },
      updateValue: function (event, detail, sender) {
        event.preventDefault();

        var value = this.inputToPort(sender);
        var name = sender.getAttribute('name');
        var port;
        this.inports.forEach(function (p) {
          if (p.name === name) {
            port = p;
          }
        });

        if (port.type!=='string' && (sender.value==="")) {
          // Empty string should remove number, object, array IIPs
          this.removeValue(event, detail, sender);
          return;
        }

        var validatePortValue = function(type, value) {
          switch (type) {
            case 'number':
            case 'int':
              return (value!=="" && !isNaN(value));
            case 'object':
              return value instanceof Object;
            case 'array':
              return value instanceof Array;
            case 'date':
              return value instanceof Date;
          }
          return true;
        };

        var setPortValue = function(value) {
          if (!this.scrubbing) {
            this.graph.startTransaction('iipchange');
          }
          this.graph.removeInitial(this.node.id, name);
          this.graph.addInitial(value, this.node.id, name);
          if (!this.scrubbing) {
            this.graph.endTransaction('iipchange');
          }
        }.bind(this);

        if (validatePortValue(port.type, value)) {
          if (typeof value === 'function') {
            // async callback
            value(setPortValue);
          } else {
            setPortValue(value);
          }
          sender.parentNode.parentNode.classList.remove('error');
        } else {
          sender.parentNode.parentNode.classList.add('error');
        }
      },
      scrubbing: false,
      scrubStart: function (event, detail, sender) {
        if (sender.value===null) {
          sender.value = 0;
        }
        // This need to work with the journal
        // this.scrubbing = true;
        // this.graph.startTransaction('iipscrub');
      },
      scrubEnd: function () {
        // this.graph.endTransaction('iipscrub');
        // this.scrubbing = false;
      },
      removeValue: function (event, detail, sender) {
        event.preventDefault();
        var name = sender.getAttribute('data-port');
        if (!name) {
          name = sender.getAttribute('name');
        }
        this.graph.removeInitial(this.node.id, name);
        this.inports.forEach(function (port) {
          if (port.name === name) {
            port.value = null;
          }
        });
        sender.parentNode.parentNode.classList.remove('error');
      },
      sendBang: function (event, detail, sender) {
        event.preventDefault();
        var name = sender.getAttribute('name');
        this.graph.startTransaction('bang');
        this.graph.removeInitial(this.node.id, name);
        this.graph.addInitial(true, this.node.id, name);
        this.graph.removeInitial(this.node.id, name);
        this.graph.endTransaction('bang');
      },
      error: function () {
        this.renderLogs();
      },
      errorLogChanged: function () {
        this.renderLogs();
      },
      clearErrors: function () {
        this.errorLog.clear();
        this.lastErrorLog = 0;
        this.$.errorEvents.innerHTML = '';
      },
      renderLogs: function () {
        var first = this.lastErrorLog;
        var i, item, li, content;
        if (this.errorLog.length - this.lastErrorLog > this.showErrorLogs) {
          first = this.errorLog.length - this.showErrorLogs;
        }
        var fragment = document.createDocumentFragment();
        for (i = first; i < this.errorLog.length; i++) {
          item = this.errorLog.get(i);
          if (!item) {
            continue;
          }
          li = document.createElement('li');
          content = document.createTextNode(item);
          li.appendChild(content);
          fragment.appendChild(li);
        }
        this.$.errorEvents.appendChild(fragment);
        // Scroll to bottom
        while (this.$.errorEvents.childElementCount > this.showErrorLogs) {
          this.$.errorEvents.removeChild(this.$.errorEvents.firstChild);
        }
        this.$.errorEvents.scrollTop = this.$.errorEvents.scrollHeight;
        this.lastErrorLog = this.errorLog.length;
      }
    });
  ;

    Polymer('noflo-exported-inspector', {
      name: '',
      direction: 'input',
      publicport: '',
      privateport: null,
      graph: null,
      attached: function () {
        document.getElementById('container').classList.add('blur');
        this.name =  this.publicport;
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        if (!this.name) {
          this.canSend = false;
          return;
        }
        if (this.direction === 'input' && (this.name === 'start' || this.name === 'graph')) {
          // Reserved port names
          this.canSend = false;
          return;
        }
        this.canSend = true;
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (this.direction === 'input') {
          if (this.name === 'start' || this.name === 'graph') {
            return;
          }
          this.graph.renameInport(this.publicport, this.name);
        } else {
          this.graph.renameOutport(this.publicport, this.name);
        }
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-new-graph', {
      name: '',
      project: '',
      runtimes: [],
      type: 'noflo-browser',
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        var duplicates = [];
        if (this.project) {
          duplicates = this.project.graphs.filter(function (graph) {
            if (graph.name === this.name) {
              return true;
            }
            return false;
          }.bind(this));
        }
        if (this.name && this.project && !duplicates.length) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newGraph');
        }
        var noflo = require('noflo');
        var graph = new noflo.Graph(this.name);
        graph.setProperties({
          project: this.project.id,
          id: this.project.id+'/'+this.name,
          environment: {
            type: this.type
          }
        });
        this.fire('new', graph);
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-group-inspector', {
      name: '',
      description: '',
      graph: null,
      nodes: [],
      group: '',
      groupdescription: '',
      attached: function () {
        document.getElementById('container').classList.add('blur');
        this.name =  this.group;
        this.description =  this.groupdescription;
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (this.group) {
          if (this.name !== this.group) {
            this.graph.renameGroup(this.group, this.name);
          }
          if (this.description !== this.groupdescription) {
            this.graph.setGroupMetadata(this.group, {
              description: this.description
            });
          }
        } else {
        this.graph.addGroup(this.name, this.nodes, {
          description: this.description
        });
        }
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('the-card-stack', {
      enteredView: function () {
        this.observeChanges();
      },
      leftView: function () {
        if (this.observer) {
          this.observer.disconnect();
        }
      },
      observeChanges: function () {
        this.observer = new MutationObserver(this.updateVisibility.bind(this));
        this.observer.observe(this, {
          subtree: false,
          childList: true,
          attributes: false,
          characterData: false
        });
      },
      updateVisibility: function () {
        if (this.childElementCount === 0) {
          this.parentNode.removeChild(this);
        }
      }
    });
  ;

    Polymer('the-card', {
      enteredView: function () {
        this.fire('show', this);
      },
      leftView: function () {
        this.fire('hide', this);
      },
      addTo: function (parent, prepend) {
        var stacks = parent.getElementsByTagName('the-card-stack');
        for (var i = 0; i < stacks.length; i++) {
          if (stacks[i].type === this.type) {
            stacks[i].appendChild(this);
            return;
          }
        }

        var stack = document.createElement('the-card-stack');
        stack.type = this.type;
        stack.appendChild(this);

        if (prepend && parent.childElementCount > 0) {
          parent.insertBefore(stack, parent.firstChild);
          return;
        }
        parent.appendChild(stack);
      }
    });
  ;

    Polymer('the-panel', {
      edge: 'left',
      size: 200,
      handle: 0,
      automatic: true,
      open: false,
      toggleOpen: function (open) {
        this.open = open;
        this.updateVisibility();
      },
      enteredView: function () {
        this.cleanUpLocation();
        this.automaticChanged();
        this.updateVisibility();
      },
      leftView: function () {
        this.unobserve();
      },
      edgeChanged: function () {
        this.updateVisibility();
      },
      sizeChanged: function () {
        this.updateVisibility();
      },
      handleChanged: function () {
        this.updateVisibility();
      },
      openChanged: function () {
        this.updateVisibility();
      },
      automaticChanged: function () {
        if (this.automatic) {
          this.observeChanges();
        } else {
          this.unobserve();
        }
      },
      getHeader: function () {
        return this.querySelector('header');
      },
      getMain: function () {
        return this.querySelector('main');
      },
      getFooter: function () {
        return this.querySelector('footer');
      },
      handleClicked: function (event) {
        if (this.automatic) {
          return;
        }
        if (event.target !== this) {
          return;
        }
        if (this.open) {
          this.open = false;
          return;
        }
        this.open = true;
      },
      observeChanges: function () {
        this.observer = new MutationObserver(this.handleMutations.bind(this));
        this.observer.observe(this.getMain(), {
          subtree: false,
          childList: true,
          attributes: false,
          characterData: false
        });
      },
      unobserve: function () {
        if (!this.observer) {
          return;
        }
        this.observer.disconnect();
        this.observer = null;
      },
      handleMutations: function () {
        if (this.getMain().childElementCount === 0) {
          this.open = false;
        } else {
          this.open = true;
        }
      },
      getPositionDimension: function () {
        return this.edge;
      },
      getSizeDimensions: function () {
        switch (this.edge) {
          case 'left':
          case 'right':
            return ['width', 'height'];
          case 'top':
          case 'bottom':
            return ['height', 'width'];
        }
      },
      cleanUpLocation: function () {
        this.style.left = '';
        this.style.right = '';
        this.style.top = '';
        this.style.bottom = '';
      },
      updateVisibility: function () {
        var sizeDimensions = this.getSizeDimensions();
        this.style[sizeDimensions[1]] = '100%';
        this.style[sizeDimensions[0]] = this.size + 'px';
        var outside = 0;
        if (!this.open) {
          outside = (this.size - this.handle) * -1;
        }
        this.style[this.getPositionDimension()] = outside + 'px';
      }
    });
  ;

    Polymer('noflo-context', {
      project: null,
      search: null,
      editor: null,
      runtime: null,
      graphs: [],
      nodes: [],
      edges: [],
      errors: [],
      runtimes: [],
      component: '',
      help: null,
      attached: function () {
        this.contextBar = this.$.context;
        window.addEventListener('keyup', function (e) {
          if (e.keyCode === 27) {
            this.clearSelection();
          }
        }.bind(this));

        // Workaround for https://github.com/Polymer/PointerEvents/issues/134
        document.addEventListener('touchstart', function () {});

        this.help = document.querySelector('noflo-help');
      },
      clearSelection: function () {
        var edge, node;
        // Clear selections on Esc
        while (this.edges.length) {
          edge = this.edges.pop();
          edge.selected = false;
        }
        while (this.nodes.length) {
          node = this.nodes.pop();
          node.selected = false;
        }
      },
      getpanel: function () {
        this.fire('toolpanel', this.$.fixed);
        this.fire('contextpanel', this.$.context);
      },
      editorChanged: function () {
        if (!this.editor) {
          return;
        }
        this.editor.addMenuAction('graphInport', 'n4', {
          icon: 'pencil-square-o',
          iconLabel: 'rename',
          action: function (graph, itemKey, item) {
            var dialog = document.createElement('noflo-exported-inspector');
            dialog.graph = this.graphs[this.graphs.length - 1];
            dialog.publicport = itemKey;
            dialog.privateport = item;
            dialog.direction = 'input';
            document.body.appendChild(dialog);
          }.bind(this)
        });
        this.editor.addMenuAction('graphOutport', 'n4', {
          icon: 'pencil-square-o',
          iconLabel: 'rename',
          action: function (graph, itemKey, item) {
            var dialog = document.createElement('noflo-exported-inspector');
            dialog.graph = this.graphs[this.graphs.length - 1];
            dialog.publicport = itemKey;
            dialog.privateport = item;
            dialog.direction = 'output';
            document.body.appendChild(dialog);
          }.bind(this)
        });
        this.editor.addMenuAction('selection', 'e4', {
          icon: 'sitemap',
          iconLabel: 'graph',
          action: this.subgraph.bind(this)
        });
        this.editor.addMenuAction('selection', 'w4', {
          icon: 'square-o',
          iconLabel: 'group',
          action: this.group.bind(this)
        });
        this.editor.addMenuCallback('node', function (defaultMenu, options) {
          if (!options.item.component) {
            return defaultMenu;
          }
          if (!this.canGetSource(options.item.component)) {
            return defaultMenu;
          }
          var i, menuKey;
          var localMenu = {};
          var project = this.project;
          var openAction =  {
            icon: 'arrow-circle-o-up',
            iconLabel: 'open',
            action: function (graph, itemKey, item) {
              if (typeof ga === 'function') {
                ga('send', 'event', 'menu', 'click', 'openNode');
              }
              // Work around Firefox location.hash getter bug #352
              var hash = window.location.href.split('#')[1] || '';
              window.location.hash = hash + '/' + encodeURIComponent(item.id);
            }
          };
          for (menuKey in defaultMenu) {
            localMenu[menuKey] = defaultMenu[menuKey];
          }
          localMenu.n4 = openAction;
          return localMenu;
        }.bind(this));
      },
      edgesChanged: function () {
        this.fire('edges', this.edges);
      },
      componentChanged: function () {
        if (this.component && typeof this.component === 'object' && !this.component.name) {
          this.component = null;
        }
        if (this.component && typeof ga === 'function') {
          ga('send', 'event', 'url', 'navigation', 'openComponent');
        }
        this.fire('component', this.component);
      },
      clear: function () {
        this.project = null;
        this.graphs.splice(0, this.graphs.length);
        this.nodes.splice(0, this.nodes.length);
        this.edges.splice(0, this.edges.length);
      },
      group: function (graph, itemKey, item) {
        if (typeof ga === 'function') {
          ga('send', 'event', 'menu', 'click', 'createGroup');
        }

        // See if the nodes are already part of a group
        var group = '';
        var description = '';
        var selectedNodes = item.nodes;
        selectedNodes.sort();

        graph.groups.forEach(function (grp) {
          var grpNodes = JSON.parse(JSON.stringify(grp.nodes));
          grpNodes.sort();
          if (grpNodes.join(',') == selectedNodes.join(',')) {
            group = grp.name;
            description = grp.metadata.description;
          }
        });

        var dialog = document.createElement('noflo-group-inspector');
        dialog.group = group;
        dialog.groupdescription = description;
        dialog.nodes = selectedNodes;
        dialog.graph = graph;
        document.body.appendChild(dialog);
      },
      subgraph: function (currentGraph, itemKey, item) {
        if (!this.project) {
          return;
        }

        if (typeof ga === 'function') {
          ga('send', 'event', 'menu', 'click', 'createSubgraph');
        }

        // Ask user to name the new subgraph
        var dialog = document.createElement('noflo-new-graph');
        dialog.runtimes = this.runtimes;
        dialog.type = currentGraph.properties.environment.type;
        dialog.project = currentGraph.properties.project;
        document.body.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          var graph = event.detail;
          graph.startTransaction('newsubgraph');

          graph.setProperties({
            id: currentGraph.properties.project + '/' + graph.name.replace(' ', '_'),
            project: currentGraph.properties.project
          });

          // Copy nodes
          item.nodes.forEach(function (id) {
            var node = currentGraph.getNode(id);
            graph.addNode(node.id, node.component, node.metadata);
          });

          // Copy edges between nodes
          currentGraph.edges.forEach(function (edge) {
            if (graph.getNode(edge.from.node) && graph.getNode(edge.to.node)) {
              graph.addEdge(edge.from.node, edge.from.port, edge.to.node, edge.to.port, edge.metadata);
            }
          });

          // Move IIPs to subgraph as well
          currentGraph.initializers.forEach(function (iip) {
            if (graph.getNode(iip.to.node)) {
              graph.addInitial(iip.from.data, iip.to.node, iip.to.port, iip.metadata);
            }
          });

          // Create subgraph node
          var initialMetadata = currentGraph.getNode(item.nodes[0]).metadata;
          currentGraph.startTransaction('subgraph');
          currentGraph.addNode(graph.properties.id, currentGraph.properties.project + '/' + graph.name, {
            label: graph.name,
            x: initialMetadata.x,
            y: initialMetadata.y
          });

          var subgraphPort = function (node, port) {
            var portName = node + '.' + port;
            return portName.replace(/(.*)\/(.*)(_.*)\.(.*)/, '$2_$4').toLowerCase();
          };

          // Reconnect external edges to subgraph node
          currentGraph.edges.forEach(function (edge) {
            // Edge from outside the new subgraph to a subgraph port
            if (!graph.getNode(edge.from.node) && graph.getNode(edge.to.node)) {
              // Create exported inport
              var inport = subgraphPort(edge.to.node, edge.to.port);
              graph.addInport(inport, edge.to.node, edge.to.port);
              currentGraph.addEdge(edge.from.node, edge.from.port, graph.properties.id, inport);
            }
            // Edge from subgraph port to the outside
            if (graph.getNode(edge.from.node) && !graph.getNode(edge.to.node)) {
              var outport = subgraphPort(edge.from.node, edge.from.port);
              graph.addOutport(outport, edge.from.node, edge.from.port);
              currentGraph.addEdge(graph.properties.id, outport, edge.to.node, edge.to.port);
            }
          });

          // Remove the selected nodes
          item.nodes.forEach(function (id) {
            currentGraph.removeNode(id);
          });

          // Emit new subgraph so that it can be stored
          graph.endTransaction('newsubgraph');
          this.project.graphs.push(graph);
          this.fire('newgraph', graph);

          // End the transaction on the main graph
          setTimeout(function () {
            currentGraph.endTransaction('subgraph');
          }, 5);

          // Editor deselect, hide node inspectors
          if (this.editor) {
            console.log('noflo-context: set selected nodes');
            this.editor.selectedNodes = [];
          }
        }.bind(this));
      },
      setHelp: function () {
        // If manually triggered, show something relevant
        if (!this.help) { return; }
        this.help.headline = 'NoFlo Development Environment graph editor';
        this.help.text = 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.';
      },
      showHelp: function (graph) {
        if (!this.help) {
          return;
        }
        this.help.show('NoFlo Development Environment graph editor', 'Here you can edit your Flow-Based graphs and run them. To add nodes, search for components using the search area on the top-left corner.');
        graph.once('addNode', function () {
          this.help.close();
        }.bind(this));
      },
      libraryMatch: function (library, project) {
        if (library === project.id) {
          return true;
        }
        if (library === project.id.replace('noflo-')) {
          return true;
        }
        if (!project.repo) {
          return false;
        }
        var repoParts = project.repo.split('/');
        if (repoParts.length !== 2) {
          return false;
        }
        if (library === repoParts[1]) {
          return true;
        }
        if (library === repoParts[1].replace('noflo-', '')) {
          return true;
        }
        return false;
      },
      canGetSource: function (component) {
        var componentParts = component.split('/');

        if (componentParts.length > 1 && this.project && this.libraryMatch(componentParts.shift(), this.project)) {
          // Local component, see if it is available
          for (i = 0; i < this.project.graphs.length; i++) {
            if (this.project.graphs[i].name === componentParts[0]) {
              return true;
            }
            if (this.project.graphs[i].properties.id === componentParts[0]) {
              return true;
            }
          }
          for (i = 0; i < this.project.components.length; i++) {
            if (this.project.components[i].name === componentParts[0]) {
              return true;
            }
          }
        }

        // Otherwise we check if Runtime can get it for us
        if (!this.runtime) {
          return false;
        }
        if (!this.runtime.canDo) {
          return false;
        }
        if (this.runtime.canDo('component:getsource') && this.runtime.isConnected()) {
          return true;
        }
        return false;
      }
    });
  ;

    Polymer('noflo-preview', {
      runtime: null,
      returnTo: null,
      maximized: false,
      attached: function () {
      },
      button: function (event, data, sender) {
        event.preventDefault();
        var action = sender.getAttribute('data-action');
        this[action]();
      },
      maximizedChanged: function() {
        if (this.maximized) {
          this.classList.add('maximized');
          this.parentNode.classList.add('maximized');
          this.$.preview.classList.add('maximized');
        } else {
          this.classList.remove('maximized');
          this.parentNode.classList.remove('maximized');
          this.$.preview.classList.remove('maximized');
        }
        this.fire('maximized', this.maximized);
      },
      maximizeToggle: function () {
        this.maximized = !this.maximized;
      },
      runtimeChanged: function () {
        // Capture runtime container to here
        var element = this.runtime.getElement();
        if (!element) {
          return;
        }
        this.$.preview.appendChild(element);
      },
      detached: function () {
        if (!this.runtime || !this.returnTo) {
          return;
        }
        var element = this.runtime.getElement();
        if (!element) {
          return;
        }
        // Return runtime element to main container
        this.returnTo.appendChild(element);
      }
    });
  ;

    Polymer('noflo-runtime-browserdebug', {
      qrCodeUrl: '',
      runtimeUrl: '',
      baseApp: 'http://noflojs.org/noflo-browser-app/main.html',
      runtime: {},
      attached: function () {
        document.getElementById('container').classList.add('blur');
        this.generateRuntimeInfo();
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      generateRuntimeInfo: function () {
        var signaller = 'https://api.flowhub.io';
        var id = require('uuid')();
        var address = signaller+'#'+id;
        var params = '?fbp_noload=true&fbp_protocol=webrtc&fbp_address='+encodeURIComponent(address);
        var runtime = {
          id: id,
          seenHoursAgo: 1,
          user: "3f3a8187-0931-4611-8963-239c0dff1931", // FIXME: correct
          secret: "my-super-secret", // FIXME: correct
          label: "noflo-browser live debug",
          description: "On device debugging project",
          graph: this.graph.properties.id,
          protocol: 'webrtc',
          type: 'noflo-browser',
          address: address
        };
        this.runtime = runtime;
        var appDebugUrl = this.baseApp+params;
        var qrBase = 'https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=';

        this.qrCodeUrl = qrBase+encodeURIComponent(appDebugUrl);
        this.runtimeUrl = appDebugUrl;
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      connectRuntime: function () {
          this.fire('runtime', this.runtime);
          this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-runtime-customiframe', {
      runtimeUrl: 'http://noflojs.org/noflo-browser/everything.html',
      runtime: {},
      attached: function () {
        document.getElementById('container').classList.add('blur');
        this.generateRuntimeInfo();
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      generateRuntimeInfo: function () {
        var id = require('uuid')(); // TODO: make a hash of the URL instead??
        var params = '?fbp_noload=true&fbp_protocol=iframe';
        var address = this.runtimeUrl+params;
        var runtime = {
          id: id,
          seenHoursAgo: 1,
          user: "3f3a8187-0931-4611-8963-239c0dff1932", // FIXME: correct
          label: "noflo-browser iframe",
          description: "running in iframe",
          graph: this.graph.properties.id,
          protocol: 'iframe',
          type: 'noflo-browser',
          address: address
        };
        this.runtime = runtime;
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      connectRuntime: function () {
          this.fire('runtime', this.runtime);
          this.close();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-runtime-selector', {
      available: [],
      attached: function () {
        document.getElementById('container').classList.add('blur');
        var type = this.graph.properties.environment.type;

        // Insert button to launch new runtime for noflo-browser
        var launchNewBrowserRuntime = {
          id: 'new-browser-runtime',
          label: 'Launch new runtime',
          address: "WebRTC"
        };
        var customIframeRuntime = {
          id: 'custom-iframe-address',
          label: 'Custom iframe URL',
          address: "myapp.html"
        };
        var launchImgfloHerokuRuntime = {
          id: 'imgflo-heroku-new',
          label: 'New imgflo app on Heroku',
          address: "myapp.herokuapps.com"
        };

        if (type == 'noflo-browser') {
          this.available.push(launchNewBrowserRuntime);
          this.available.push(customIframeRuntime);
        }
        if (type == 'imgflo') {
           this.available.push(launchImgfloHerokuRuntime);
        }

        this.runtimes.forEach(function (rt) {
          if (!rt.type) {
            return;
          }
          if ((rt.type == type || type === 'all') && this.available.indexOf(rt) === -1) {
            this.available.push(rt);
          }
        }.bind(this));
        this.available.forEach(this.checkRuntimeSeen.bind(this));
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      // similiar to in noflo-main.html
      checkRuntimeSeen: function (runtime) {
        if (!runtime.seen) {
          runtime.seen = Date.now();
        }
        runtime.seenHoursAgo = Math.floor((Date.now() - new Date(runtime.seen).getTime()) / (60*60*1000));
        if ((runtime.seenHoursAgo / 24) > 31) {
          // We haven't seen this runtime in over a month, don't show it
          var index = this.available.indexOf(runtime);
          this.available.splice(index,1);
        }
      },
      selectRuntime: function (event, details, sender) {
        var id = sender.getAttribute('data-id');
        if (id == 'new-browser-runtime') {
          // Launch new runtime instead of connect to existing
          this.close();
          this.debugOnDevice();
          return;
        } else if (id == 'custom-iframe-address') {
          // Add new iframe runtime for given address
          this.close();
          this.addIframeRuntime();
          return;
        } else if (id == 'imgflo-heroku-new') {
          this.close();
          this.deployHeroku("https://github.com/jonnor/imgflo");
        }
        this.runtimes.forEach(function (runtime) {
          if (runtime.id === id) {
            this.fire('runtime', runtime);
            this.close();
          }
        }.bind(this));
      },
      debugOnDevice: function () {
        this.debugOnDeviceModal = document.createElement('noflo-runtime-browserdebug');
        this.debugOnDeviceModal.graph = this.graph;
        this.debugOnDeviceModal.addEventListener('runtime', function (event) {
          var runtime = event.detail;
          this.fire('runtime', runtime);
        }.bind(this));
        document.body.appendChild(this.debugOnDeviceModal);
      },
      addIframeRuntime: function () {
        this.addIframeModal = document.createElement('noflo-runtime-customiframe');
        this.addIframeModal.graph = this.graph;
        this.addIframeModal.addEventListener('runtime', function (event) {
          var runtime = event.detail;
          this.fire('runtime', runtime);
        }.bind(this));
        document.body.appendChild(this.addIframeModal);
      },
      deployHeroku: function (template) {
        // Send user over to Heroku
        // The deployed runtime will then have a link which takes them back to Flowhub
        // TODO: inform the user about this process
        var baseUrl = "https://dashboard.heroku.com/new?template=";
        document.location.href = baseUrl + encodeURIComponent(template);
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    (function() {
      Polymer('noflo-runtime-testdetails', {
        suites: [],
        attached: function () {
          document.getElementById('container').classList.add('blur');
          var fbpSpec = require('fbp-spec');
          React.render(fbpSpec.ui.widgets.TestsListing({
            suites: this.suites
          }), this.$.testlisting);
        },
        detached: function () {
          document.getElementById('container').classList.remove('blur');
        },
        close: function () {
          if (!this.parentNode) {
            return;
          }
          this.parentNode.removeChild(this);
        }
      });
    })();
  ;

    Polymer('noflo-runtime', {
      graph: null,
      runtime: null,
      runtimes: [],
      suites: [],
      online: false,
      execution: {
        label: 'not started',
        running: false
      },
      card: null,
      panel: null,
      wasConnected: false,
      clearRuntime: function () {
        for (var i = 0; i < this.runtimes.length; i++) {
          if (this.runtimes[i].graph === this.graph.properties.id) {
            this.runtimes[i].graph = null;
            this.fire('changed', this.runtimes[i]);
          }
        }
        this.runtime = null;
        this.graphChanged();
      },
      graphChanged: function () {
        this.wasConnected = false;
        if (this.card) {
          this.card.parentNode.removeChild(this.card);
          this.card = null;
        }
        if (this.runtimeSelector) {
          if (this.runtimeSelector.parentNode) {
            this.runtimeSelector.parentNode.removeChild(this.runtimeSelector);
          }
          this.runtimeSelector = null;
        }
        if (this.runtime && this.graph) {
          this.runtime.setMain(this.graph);
        }
      },
      runtimeChanged: function () {
        this.online = false;
        this.execution.running = false;
        this.execution.label = 'not started';

        this.icon = this.getRuntimeIcon(this.runtime);

        if (this.panel) {
          this.panel.open = false;
        }

        if (!this.runtime) {
          return;
        }
        this.runtime.setMain(this.graph);
        if (this.graph && this.runtime.isConnected && this.runtime.isConnected()) {
          this.online = true;
          this.runtime.sendNetwork('getstatus', {
            graph: this.graph.name || this.graph.properties.id
          });
        }
        this.runtime.on('execution', function(status) {
          if (status.running) {
            this.execution.running = true;
          } else {
            this.execution.running = false;
          }
          if (!status.started) {
            this.execution.label = "not started";
          } else if (status.started && !status.running) {
            this.execution.label = "finished";
          } else if (status.started && status.running) {
            this.execution.label = "running";
          }
        }.bind(this));
        this.runtime.on('status', function (status) {
          this.online = status.online;
          if (!this.online) {
            this.hideCard();
            this.execution.running = false;
            this.execution.label = 'not started';
            if (this.panel) {
              this.panel.open = false;
            }
          }
        }.bind(this));
        this.runtime.on('network', function (message) {
          if (message.command === 'error') {
            this.notify('Error', message.payload.message);
            return;
          }
        }.bind(this));
      },
      start: function (event) {
        event.preventDefault();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'startRuntime');
        }
        this.requestNotificationPermission();
        if (this.card) {
          this.runtime.start();
          return;
        }
        this.showCard();
        if (this.runtime.getType() === 'iframe') {
          this.runtime.once('capabilities', function () {
            setTimeout(function () {
              this.runtime.start();
            }.bind(this), 1);
          }.bind(this));
          return;
        }
        this.runtime.start();
      },
      stop: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'stopRuntime');
        }
        this.runtime.stop();
      },
      reconnect: function (event) {
        if (event) {
          event.preventDefault();
        }
        this.runtime.reconnect();
      },
      showTests: function (suites) {
        var fbpSpec = require('fbp-spec');
        this.suites = suites;
        var container = this.shadowRoot.getElementById('teststatus');
        if (!container) {
          return;
        }
        React.render(fbpSpec.ui.widgets.TestStatus({
          suites: this.suites
        }), container);
      },
      showTestDetails: function () {
        if (!this.suites || !this.suites.length) {
          return;
        }
        var details = document.createElement('noflo-runtime-testdetails');
        details.suites = this.suites;
        document.body.appendChild(details);
      },
      showCard: function () {
        if (this.card || !this.panel) {
          return;
        }
        this.card = document.createElement('the-card');
        this.card.type = 'noflo-runtime-preview';
        // Move the preview element of the runtime into the card
        var preview = document.createElement('noflo-preview');
        preview.classList.add('the-card-content');
        preview.runtime = this.runtime;
        preview.returnTo = this.parentNode;
        this.card.appendChild(preview);
        this.card.addTo(this.panel.getMain());
        if (this.runtime.definition.protocol === 'iframe') {
          this.panel.open = true;
        }
      },
      hideCard: function () {
        if (!this.card) {
          return;
        }
        var el = this.runtime.getElement();
        this.card.parentNode.removeChild(this.card);
        this.card = null;
      },
      selectRuntime: function () {
        if (!this.graph) {
          return;
        }
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        this.runtimeSelector = document.createElement('noflo-runtime-selector');
        this.runtimeSelector.graph = this.graph;
        this.runtimeSelector.runtimes = this.runtimes;
        this.runtimeSelector.addEventListener('runtime', function (event) {
          var runtime = event.detail;
          runtime.graph = this.graph.properties.id;
          runtime.project = this.graph.properties.project;
          this.fire('changed', runtime);
          this.fire('runtime', runtime);
        }.bind(this));
        document.body.appendChild(this.runtimeSelector);
      },
      canNotify: function () {
        return ("Notification" in window);
      },
      allowedToNotify: function () {
        if (!this.canNotify()) {
          return false;
        }
        if (Notification.permission === "denied") {
          return false;
        }
        return true;
      },
      requestNotificationPermission: function () {
        if (!this.canNotify()) {
          return;
        }
        if (!this.allowedToNotify()) {
          return;
        }
        // Don't bug them if they already clicked
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
          Notification.requestPermission(function (permission) {
            // Whatever the user answers, we make sure we store the information
            if(!('permission' in Notification)) {
              Notification.permission = permission;
            }
          });
        }
      },
      notifications: [],
      notify: function (title, message) {
        if (!this.allowedToNotify()) {
          if (!console || !console.log) {
            return;
          }
          console.log(title + ': ' + message);
          return;
        }
        // Check if notification is duplicate
        var duplicates = this.notifications.filter(function (n) {
          if (n.title === title && n.body === message) {
            return true;
          }
          return false;
        });
        if (duplicates.length) {
          return;
        }
        var notification = new Notification(title, {
          body: message,
          icon: 'app/noflo-64.png'
        });
        this.notifications.push(notification);
        notification.addEventListener('close', function () {
          this.notifications.splice(this.notifications.indexOf(notification), 1);
        }.bind(this), false);
      },
      getRuntimeIcon: function (runtime) {
        if (!runtime || !runtime.definition || !runtime.definition.type) {
          return 'cog';
        }
        switch (runtime.definition.type) {
          case 'noflo-browser':
            return 'html5';
          case 'noflo-nodejs':
            return 'cloud';
          case 'noflo-gnome':
            return 'desktop';
          case 'noflo-gnome':
            return 'desktop';
          case 'microflo':
            return 'lightbulb-o';
          case 'javafbp':
            return 'android';
          case 'imgflo':
            return 'picture-o';
          case 'sndflo':
            return 'music';
        }
      }
    });
  ;

  (function () {
    "use strict";

    Polymer('the-graph-nav', {
      width: 200,
      height: 150,
      hide: false,
      thumbscale: 1,
      backgroundColor: "hsla(184, 8%, 75%, 0.9)",
      outsideFill: "hsla(0, 0%, 0%, 0.4)",
      ready: function () {
        this.viewrectangle = [0,0,500,500];
        this.scaledviewrectangle = [0,0,200,150];
        this.theme = "dark";
      },
      attached: function () {
        this.style.overflow = "hidden";
        this.style.cursor = "move";
        this.style.width = this.width + "px";
        this.style.height = this.height + "px";

        // HACK way to make PolymerGestures work for now
        var noop = function(){};
        PolymerGestures.addEventListener(this, "track", noop);
        PolymerGestures.addEventListener(this, "trackend", noop);
        PolymerGestures.addEventListener(this, "tap", noop);

        // Pan graph by dragging map
        this.addEventListener("track", function (event) {
          if (!this.editor) { return; }
          // Don't pan graph
          event.stopPropagation();

          var x = this.editor.pan[0];
          var y = this.editor.pan[1];
          var panscale = this.thumbscale / this.editor.scale;
          x -= event.ddx / panscale;
          y -= event.ddy / panscale;
          this.editor.pan = [Math.round(x), Math.round(y)];

          event.preventTap();
        }.bind(this));
        this.addEventListener("trackend", function (event) {
          // Don't pan graph
          event.stopPropagation();
        }.bind(this));

        // Tap to fit
        this.addEventListener("tap", function () {
          if (!this.editor) { return; }
          this.editor.triggerFit();
        });
      },
      observe: {
        'editor.scale': 'editorScaleChanged',
        'editor.width': 'editorWidthChanged',
        'editor.height': 'editorHeightChanged',
        'editor.pan': 'editorPanChanged',
        'editor.theme': 'editorThemeChanged'
      },
      editorChanged: function (oldEditor, newEditor) {
      },
      editorPanChanged: function () {
        if (!this.editor.pan) { return; }
        var x = this.editor.pan[0];
        var y = this.editor.pan[1];

        this.viewrectangle[0] = -x;
        this.viewrectangle[1] = -y;
      },
      editorWidthChanged: function () {
        this.viewrectangle[2] = parseInt(this.editor.width, 10);
      },
      editorHeightChanged: function () {
        this.viewrectangle[3] = parseInt(this.editor.height, 10);
      },
      editorScaleChanged: function () {
        this.scale = this.editor.scale;
      },
      editorThemeChanged: function () {
        if (this.editor.theme === "dark") {
          this.viewBoxBorder =  "hsla(190, 100%, 80%, 0.4)";
          this.viewBoxBorder2 = "hsla( 10,  60%, 32%, 0.3)";
          this.outsideFill = "hsla(0, 0%, 0%, 0.4)";
          this.backgroundColor = "hsla(0, 0%, 0%, 0.9)";
        } else {
          this.viewBoxBorder =  "hsla(190, 100%, 20%, 0.8)";
          this.viewBoxBorder2 = "hsla( 10,  60%, 80%, 0.8)";
          this.outsideFill = "hsla(0, 0%, 100%, 0.4)";
          this.backgroundColor = "hsla(0, 0%, 100%, 0.9)";
        }
        this.style.backgroundColor = this.backgroundColor;
        // Redraw rectangle
        this.viewrectangleChanged();
      },
      viewrectangleChanged: function () {
        // Canvas to grey out outside view
        var context = this.$.outcanvas.getContext('2d');
        context = unwrap(context);
        context.clearRect(0, 0, this.width, this.height);
        context.fillStyle = this.outsideFill;

        // Scaled view rectangle
        var x = Math.round( (this.viewrectangle[0]/this.scale - this.thumbrectangle[0]) * this.thumbscale );
        var y = Math.round( (this.viewrectangle[1]/this.scale - this.thumbrectangle[1]) * this.thumbscale );
        var w = Math.round( this.viewrectangle[2] * this.thumbscale / this.scale );
        var h = Math.round( this.viewrectangle[3] * this.thumbscale / this.scale );

        if (x<0 && y<0 && w>this.width-x && h>this.height-y) {
          // Hide map
          this.hide = true;
          return;
        } else {
          // Show map
          this.hide = false;
        }

        // Clip to bounds
        // Left
        if (x < 0) { 
          w += x; 
          x = 0;
          this.$.viewrect.style.borderLeftColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderLeftColor = this.viewBoxBorder;
          context.fillRect(0, 0, x, this.height);
        }
        // Top
        if (y < 0) { 
          h += y; 
          y = 0;
          this.$.viewrect.style.borderTopColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderTopColor = this.viewBoxBorder;
          context.fillRect(x, 0, w, y);
        }
        // Right
        if (w > this.width-x) { 
          w = this.width-x;
          this.$.viewrect.style.borderRightColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderRightColor = this.viewBoxBorder;
          context.fillRect(x+w, 0, this.width-(x+w), this.height);
        }
        // Bottom
        if (h > this.height-y) { 
          h = this.height-y;
          this.$.viewrect.style.borderBottomColor = this.viewBoxBorder2;
        } else {
          this.$.viewrect.style.borderBottomColor = this.viewBoxBorder;
          context.fillRect(x, y+h, w, this.height-(y+h));
        }

        // Size and translate rect
        this.$.viewrect.style.left = x+"px";
        this.$.viewrect.style.top = y+"px";
        this.$.viewrect.style.width = w+"px";
        this.$.viewrect.style.height = h+"px";
        // this.scaledviewrectangle = [x, y, w, h];
      },
      hideChanged: function () {
        if (this.hide) {
          this.style.display = "none";
        } else {
          this.style.display = "block";
        }
      },
      thumbscaleChanged: function () {
        this.viewrectangleChanged();
      },
      thumbrectangleChanged: function () {
        // Binding this from the-graph-thumb to know the dimensions rendered
        var w = this.thumbrectangle[2];
        var h = this.thumbrectangle[3];
        this.thumbscale = (w>h) ? this.width/w : this.height/h;
      }
    });

  })();
  ;

    Polymer('noflo-journal', {
      db: null,
      graph: null,
      editor: null,
      returnTo: null,
      klay: false,
      hidenav: false,
      canUndo: false,
      canRedo: false,
      attached: function () {
        this.klay = true;
      },
      graphChanged: function () {
        this.checkState();
        if (!this.graph || !this.graph.on) {
          return;
        }

        var positionedNodes = this.graph.nodes.filter(function (node) {
          if (!node.metadata) {
            return false;
          }
          if (!node.metadata.x || !node.metadata.y) {
            return false;
          }
          return true;
        });
        if (this.graph.nodes.length && !positionedNodes.length) {
          setTimeout(function () {
            this.autolayout();
          }.bind(this), 10);
        }

        if (!this.graph.properties.project || this.graph.journal || !this.db) {
          return;
        }

        // Initialize persistent journal whenever needed
        var noflo = require('noflo');
        var IDBJournalStore = require('noflo-ui/src/JournalStore').IDBJournalStore;
        var store = new IDBJournalStore(this.graph, this.db);
        store.init(function () {
          this.graph.journal = new noflo.Journal(this.graph, undefined, store);
          this.checkState();
          this.graph.journal.store.on('transaction', function () {
            this.checkState();
          }.bind(this));
        }.bind(this));
      },
      checkState: function () {
        if (!this.graph || !this.graph.journal) {
          this.canUndo = false;
          this.canRedo = false;
          return;
        }
        this.canUndo = this.graph.journal.canUndo();
        this.canRedo = this.graph.journal.canRedo();
      },
      undo: function (event, data, sender) {
        if (event) {
          event.preventDefault();
        }
        if (!this.graph || !this.graph.journal) {
          return;
        }
        this.graph.journal.undo();
        this.checkState();
      },
      redo: function (event, data, sender) {
        if (event) {
          event.preventDefault();
        }
        if (!this.graph || !this.graph.journal) {
          return;
        }
        this.graph.journal.redo();
        this.checkState();
      },
      autolayout: function (event, data, sender) {
        if (event) {
          event.preventDefault();
        }
        if (!this.graph || !this.klay) {
          return;
        }
        this.editor.triggerAutolayout();
      },
      hidenavChanged: function () {
        if (this.hidenav) {
          this.$.controls.style.height = "36px";
        } else {
          this.$.controls.style.height = "180px";
        }
      }
    });
  ;

    Polymer('noflo-component-editor', {
      component: null,
      spec: null,
      project: null,
      width: null,
      height: null,
      codeEditor: null,
      testsEditor: null,
      theme: 'dark',
      ready: function () {
        this.componentChanged();
        var self = this;
        var _ = require('underscore');
        this.debouncedComponentChange = _.debounce(function () {
          self.fire('changed', self.component);
        }, 1500);
        this.debouncedSpecChange = _.debounce(function () {
          self.fire('specschanged', self.spec);
        }, 1500);
      },
      componentChanged: function () {
        if (!this.component || !this.component.name) {
          this.style.display = 'none';
          return;
        }

        this.spec = null;
        if (this.project) {
          this.project.specs.forEach(function (spec) {
            if (spec.name === this.component.name) {
              this.spec = spec;
            }
          }.bind(this));
          if (!this.spec) {
            this.spec = {
              name: this.component.name,
              changed: false,
              code: '',
              language: 'yaml',
              project: this.component.project,
              type: 'spec'
            };
            this.project.specs.push(this.spec);
          }
        }

        this.style.display = 'block';
        this.$.code_editor.innerHTML = '';

        if (!this.component.code) {
          this.component.code = this.getExampleCode();
        }

        codeOptions = this.getMirrorOptions(this.component, this.component.code);
        this.codeEditor = CodeMirror(this.$.code_editor, codeOptions);
        this.codeEditor.on('change', function () {
          this.component.code = this.codeEditor.getValue();
          this.component.changed = true;
          this.debouncedComponentChange();
        }.bind(this));
        this.setSize();
      },
      specChanged: function () {
        this.$.tests_editor.innerHTML = '';
        if (!this.spec) {
          return;
        }
        testOptions = this.getMirrorOptions(this.spec, this.spec.code);
        this.testsEditor = CodeMirror(this.$.tests_editor, testOptions);
        this.testsEditor.on('change', function () {
          this.spec.code = this.testsEditor.getValue();
          this.spec.changed = true;
          this.debouncedSpecChange();
        }.bind(this));
        this.setSize();
      },
      widthChanged: function () {
        this.setSize();
      },
      heightChanged: function () {
        this.setSize();
      },
      getMirrorOptions: function (component, value) {
        var options = {
          lineNumbers: true,
          value: value || '',
          mode: this.getMirrorMode(component.language),
          theme: this.getMirrorTheme(),
          readOnly: component.project ? false : true
        };
        var canLint = function (language) {
          return (language === 'javascript' || language === 'coffeescript');
        };
        if (canLint(component.language) && !options.readOnly) {
          options.gutters = ['CodeMirror-lint-markers'];
          options.lint = true;
        }
        return options;
      },
      getMirrorMode: function (language) {
        if (language === 'coffeescript' || language === 'javascript') {
          return language;
        } else if (language === 'yaml') {
          return 'text/x-yaml';
        } else if (language === 'python') {
          return 'text/x-python';
        } else if (language === 'c') {
          return 'text/x-csrc';
        } else if (language === 'c++') {
          return 'text/x-c++src';
        } else if (language === 'supercollider') {
          return 'text/x-stsrc'; // smalltalk-like
        }
        return 'clike';
      },
      getMirrorTheme: function () {
        if (this.theme === 'light') {
          return 'mdn-like';
        }
        return 'noflo';
      },
      getExampleCode: function () {
        // TODO: differentiate between the various runtimes
        if (this.component.language === 'coffeescript') {
          return this.$.CoffeeScriptExample.textContent.trim();
        }
        if (this.component.language === 'javascript') {
          return this.$.JavaScriptExample.textContent.trim();
        }
        if (this.component.language === 'es6' || this.component.language === 'es2015') {
          return this.$.ES2015Example.textContent.trim();
        }
        if (this.component.language === 'c') {
          return this.$.ImgfloCExample.textContent.trim();
        }
        if (this.component.language === 'supercollider') {
          return this.$.SuperColliderExample.textContent.trim();
        }
        if (this.component.language === 'python') {
          return "";
        }
        return "";
      },
      themeChanged: function () {
        if (!this.codeEditor || !this.testsEditor) {
          return;
        }
        this.codeEditor.setOption('theme', this.getMirrorTheme());
        this.testsEditor.setOption('theme', this.getMirrorTheme());
      },
      setSize: function () {
        if (!this.width || !this.height) {
          return;
        }
        var width = (this.width - 80) / 2;
        var height = this.height - 102;
        if (this.codeEditor) {
          this.codeEditor.setSize(width, height);
        }
        if (this.testsEditor) {
          this.testsEditor.setSize(width, height);
        }
      }
    });
  ;

    Polymer('noflo-menu', {
      buttons: [],
      clicked: function (event, detail, sender) {
        event.preventDefault();
        this.buttons.forEach(function (button) {
          if (button.id !== sender.getAttribute('id')) {
            return;
          }
          this.fire('click', button.id);
          if (button.search) {
            this.fire('search', button.search);
            return;
          }
          button.action();
        }.bind(this));
      }
    });
  ;

    Polymer('noflo-search-graph-results', {
      editor: null,
      results: [],
      search: '',
      detached: function () {
        this.editor = null;
      },
      resultsChanged: function () {
        if (!this.editor)
          return;
        if (!this.search || this.search.length < 1) {
          this.editor.displaySelectionGroup = true;
          this.editor.selectedNodes = [];
        } else if (this.results) {
          this.editor.displaySelectionGroup = (this.results.length > 0 ? false : true);
          this.editor.selectedNodes = this.results;
        }
      },
      clicked: function (event, details, sender) {
        event.preventDefault();
        var index = sender.getAttribute('data-index');
        var result = this.results[index];
        if (!result) {
          return;
        }
        this.editor.displaySelectionGroup = true;
        this.editor.selectedNodes = [ result ];
        this.editor.focusNode(result);
        this.fire('resultclick', result);
      }
    });
  ;

    Polymer('noflo-search-library-results', {
      results: [],
      search: '',
      clicked: function (event, details, sender) {
        event.preventDefault();
        var index = sender.getAttribute('data-index');
        var result = this.results[index];
        if (!result || !result.action) {
          return;
        }
        this.fire('resultclick', result);
        result.action();
      }
    });
  ;

    Polymer('noflo-graph-inspector', {
      description: '',
      icon: '',
      type: '',
      preview: '',
      view: 'properties',
      graph: null,
      project: null,
      runtimes: [],
      isMain: false,
      inGraph: [],
      downloadUrl: '',
      checkUpdateName: function (event, detail, sender) {
        if (event.keyCode===13) { // Enter
          event.preventDefault();
          this.updateName(event, detail, sender);
        }
      },
      updateName: function (event, detail, sender) {
        this.graph.name = sender.textContent;
      },
      attached: function () {
        document.getElementById('container').classList.add('blur');
        if (!this.graph) {
          return;
        }

        this.description = this.graph.properties.description;
        this.icon = this.graph.properties.icon || '';
        this.type = this.graph.properties.environment.type;
        this.view = 'properties';

        this.inGraph = [];
        this.isMain = false;
        if (this.project) {
          if (this.graph.properties.id === this.project.main) {
            this.isMain = true;
          } else {
            this.project.graphs.forEach(function (graph) {
              graph.nodes.forEach(function (node) {
                if (node.component === this.graph.name || node.component === this.project.id + '/' + this.graph.name) {
                  this.inGraph.push(graph);
                }
              }.bind(this));
            }.bind(this));
          }
          this.project.specs.forEach(function (spec) {
            if (spec.name === this.graph.name) {
              this.spec = spec;
            }
          }.bind(this));
          if (!this.spec) {
            this.spec = {
              name: this.graph.name,
              changed: false,
              code: '',
              language: 'yaml',
              project: this.project.id,
              type: 'spec'
            };
            this.project.specs.push(this.spec);
          }
        }
        this.prepareHtmlEditor();
        this.prepareTestsEditor();
        this.prepareDownload();
      },
      prepareDownload: function () {
        if (!window.Blob || !window.URL) {
          return;
        }
        var graph = JSON.parse(JSON.stringify(this.graph));
        if (graph.properties) {
          delete graph.properties.sha;
          delete graph.properties.changed;
          delete graph.properties.project;
          delete graph.properties.id;
        }
        var blob = new Blob([JSON.stringify(graph, null, 4)], {
          type: "application/json"
        });
        try {
          this.downloadUrl = URL.createObjectURL(blob);
        } catch (e) {
          return;
        }
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      viewChanged: function () {
        if (this.view === 'html' && this.htmlEditor) {
          setTimeout(function () {
            this.htmlEditor.setSize(576, 288);
            this.htmlEditor.focus();
          }.bind(this), 1);
        }
        if (this.view === 'tests' && this.testsEditor) {
          setTimeout(function () {
            this.testsEditor.setSize(576, 288);
            this.testsEditor.focus();
          }.bind(this), 1);
        }
      },
      prepareHtmlEditor: function () {
        if (this.type !== 'noflo-browser') {
          return;
        }
        this.htmlEditor = CodeMirror(this.$.html_editor, {
          lineNumbers: true,
          value: this.graph.properties.environment.content || '',
          language: 'htmlmixed',
          theme: 'mdn-like'
        });
      },
      prepareTestsEditor: function () {
        if (!this.spec) {
          return;
        }
        this.testsEditor = CodeMirror(this.$.tests_editor, {
          lineNumbers: true,
          value: this.spec.code || '',
          mode: this.getMirrorMode(this.spec.language),
          theme: 'mdn-like'
        });
      },
      getMirrorMode: function (language) {
        if (language === 'coffeescript' || language === 'javascript' || language === 'yaml') {
          return language;
        } else if (language === 'c') {
          return 'text/x-csrc';  
        } else if (language === 'c++') {
          return 'text/x-c++src';
        } else if (language === 'supercollider') {
          return 'text/x-stsrc'; // smalltalk-like
        }
        return 'clike';
      },
      save: function () {
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'saveGraphProperties');
        }
        var env = JSON.parse(JSON.stringify(this.graph.properties.environment));
        if (this.htmlEditor) {
            this.preview = this.htmlEditor.getValue();
            env.content = this.preview;
        }
        if (this.testsEditor && this.spec) {
            var specCode = this.testsEditor.getValue();
            if (specCode !== this.spec.code) {
              this.spec.code = specCode;
              this.spec.changed = true;
              this.fire('specschanged', this.spec);
            }
        }
        env.type = this.type;
        this.graph.setProperties({
          environment: env,
          description: this.description,
          icon: this.icon
        });
        this.close();
      },
      delete: function (event) {
        event.preventDefault();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'deleteGraph');
        }
        this.fire('delete', this.graph);
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      },
      setView: function (event, details, sender) {
        this.view = sender.id;
      }
    });
  ;

    Polymer('noflo-component-inspector', {
      component: null,
      errorText: '',
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      componentChanged: function () {
      },
      delete: function (event) {
        event.preventDefault();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'deleteComponent');
        }
        this.fire('delete', this.component);
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-search', {
      menuCard: null,
      resultsCard: null,
      searchLibraryResults: [],
      searchGraphResults: [],
      search: null,
      parentPath: '',
      graph: null,
      graphs: [],
      component: null,
      editor: null,
      panel: null,
      runtimes: [],
      graphInspector: null,
      searchLibrary: true,
      componentChanged: function () {
        if (!this.component || !this.component.name) {
          // Component nullified, ensure we recount graphs
          this.graphsChanged();
          return;
        }
        this.graph = null;
        this.updateParentPath();
      },
      graphsChanged: function () {
        if (!this.graphs.length || (this.component && this.component.name)) {
          this.graph = null;
        } else {
          this.graph = this.graphs[this.graphs.length - 1];
        }
        this.updateParentPath();
        if (this.graphInspector) {
          if (this.graphInspector.parentNode) {
            this.graphInspector.parentNode.removeChild(this.graphInspector);
          }
          this.graphInspector = null;
        }
        this.blur();
      },
      updateParentPath: function () {
        this.parentPath = '';
        if (!this.project) {
          return;
        }
        this.graphs.forEach(function (graph, idx) {
          if (this.graph && idx >= this.graphs.length - 1) {
            return;
          }
          if (idx === 0) {
            this.parentPath += '/' + encodeURIComponent(graph.properties.id);
          } else {
            var previous = this.graphs[idx - 1];
            var node = null;
            previous.nodes.forEach(function (node) {
              if (node.component === this.project.id + '/' + graph.name || node.component === this.project.id + '/' + graph.properties.id || node.component === graph.name || node.component === graph.properties.id) {
                this.parentPath += '/' + encodeURIComponent(node.id);
              }
            }.bind(this));
          }
        }.bind(this));
      },
      libraryResults: function (result) {
        this.searchLibraryResults.push(result);
      },
      graphResults: function (result) {
        this.searchGraphResults.push(result);
      },
      attached: function () {
        this.componentsObserver = new ArrayObserver(this.searchLibraryResults);
        this.componentsObserver.open(this.libraryResultsModified.bind(this));
        this.processesObserver = new ArrayObserver(this.searchGraphResults);
        this.processesObserver.open(this.graphResultsModified.bind(this));
        this.blur();
      },
      focus: function () {
        if (this.component && this.component.name) {
          return;
        }
        this.classList.remove('overlay');
        this.$.search.focus();
        if (this.search === null) {
          // Show all
          this.search = '';
        }
      },
      blur: function () {
        this.clearResults();
        this.classList.add('overlay');
      },
      toggle: function () {
        if (this.classList.contains('overlay')) {
          this.focus();
          return;
        }
        this.blur();
      },
      clearResults: function () {
        this.searchGraphResults.length = 0;
        this.searchLibraryResults.length = 0;
        // while (this.searchGraphResults.length) {
        //   this.searchGraphResults.pop();
        // }
        // while (this.searchLibraryResults.length) {
        //   this.searchLibraryResults.pop();
        // }
      },
      clearSearch: function () {
        if (this.resultsCard) {
          this.resultsCard.parentNode.removeChild(this.resultsCard);
          this.resultsCard = null;
        }
        this.search = null;
        this.blur();
      },
      switchSearch: function (event, detail, sender) {
        if (event.keyIdentifier === 'U+0009') {
          event.preventDefault();
          this.searchLibrary = !this.searchLibrary;
          if (this.searchLibrary) {
            this.$.search.classList.add('components');
            this.$.search.classList.remove('processes');
            this.$.search.placeholder = 'Search components';
          } else {
            this.$.search.classList.add('processes');
            this.$.search.classList.remove('components');
            this.$.search.placeholder = 'Search processes';
          }
          this.searchChanged();
        }
      },
      searchChanged: function () {
        this.clearResults();

        if (this.search && typeof ga === 'function') {
          ga('send', 'event', 'search', 'input', 'newSearch');
        }

        if (this.resultsCard) {
          this.resultsCard.children[0].search = this.search;
          this.resultsCard.search = this.search;
        }
        var event = this.searchLibrary ? 'search:library' : 'search:graph';
        this.fire(event, {
          search: this.search
        });
      },
      libraryResultsModified: function () {
        if (!this.searchLibrary)
          return;
        if (this.resultsCard &&
            this.resultsCard.type !== 'noflo-search-library-results') {
          this.resultsCard.parentNode.removeChild(this.resultsCard);
          this.resultsCard = null;
        }
        if (this.resultsCard || this.search === null) {
          return;
        }
        if (this.searchLibraryResults.length === 0) {
          if (this.resultsCard) {
            this.resultsCard.parentNode.removeChild(this.resultsCard);
            this.resultsCard = null;
          }
          return;
        }
        var results = document.createElement('noflo-search-library-results');
        results.id = 'results';
        results.search = this.search;
        results.results = this.searchLibraryResults;
        results.addEventListener('resultclick', function () {
          this.clearSearch();
        }.bind(this));

        this.resultsCard = document.createElement('the-card');
        this.resultsCard.type = 'noflo-search-library-results';
        this.resultsCard.appendChild(results);
        this.resultsCard.addTo(this.panel, true);
      },
      graphResultsModified: function () {
        if (this.searchLibrary)
          return;
        if (this.resultsCard &&
            this.resultsCard.type !== 'noflo-search-graph-results') {
          this.resultsCard.parentNode.removeChild(this.resultsCard);
          this.resultsCard = null;
        }
        if (this.resultsCard || this.search === null) {
          return;
        }
        if (this.searchGraphResults.length === 0) {
          if (this.resultsCard) {
            this.resultsCard.parentNode.removeChild(this.resultsCard);
            this.resultsCard = null;
          }
          return;
        }
        var results = document.createElement('noflo-search-graph-results');
        results.id = 'results';
        results.editor = this.editor;
        results.search = this.search;
        results.results = this.searchGraphResults;
        results.addEventListener('resultclick', function () {
          this.clearSearch();
        }.bind(this));

        this.resultsCard = document.createElement('the-card');
        this.resultsCard.type = 'noflo-search-graph-results';
        this.resultsCard.appendChild(results);
        this.resultsCard.addTo(this.panel, true);
      },
      showGraphInspector: function (event) {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        if (this.graphs.length === 0) {
          return;
        }
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'search', 'click', 'graphProperties');
        }
        this.graphInspector = document.createElement('noflo-graph-inspector');
        this.graphInspector.graph = this.graph;
        this.graphInspector.project = this.project;
        this.graphInspector.runtimes = this.runtimes;
        this.graphInspector.addEventListener('delete', function (event) {
          this.fire('deleteGraph', event.detail);
        }.bind(this));
        this.graphInspector.addEventListener('specschanged', function (event) {
          this.fire('specschanged', event.detail);
        }.bind(this));
        document.body.appendChild(this.graphInspector);
      },
      showComponentInspector: function (event) {
        if (event) {
          event.stopPropagation();
          event.preventDefault();
        }
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'search', 'click', 'componentProperties');
        }
        this.componentInspector = document.createElement('noflo-component-inspector');
        this.componentInspector.component = this.component;
        this.componentInspector.project = this.project;
        this.componentInspector.addEventListener('delete', function (event) {
          this.fire('deleteComponent', event.detail);
        }.bind(this));
        document.body.appendChild(this.componentInspector);
      }
    });
  ;

    Polymer('noflo-new-component', {
      name: '',
      project: '',
      language: 'coffeescript',
      canSend: false,
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      nameChanged: function () {
        var duplicates = [];
        if (this.project) {
          duplicates = this.project.components.filter(function (component) {
            if (component.name === this.name) {
              return true;
            }
            return false;
          }.bind(this));
        }
        if (this.name && this.project && !duplicates.length) {
          this.canSend = true;
        } else {
          this.canSend = false;
        }
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (!this.name) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'newComponent');
        }
        this.fire('new', {
          name: this.name,
          language: this.language,
          project: this.project.id,
          code: '',
          tests: ''
        });
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-project-inspector', {
      token: '',
      errorText: '',
      originalRepo: '',
      repo: '',
      name: '',
      main: '',
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      projectChanged: function () {
        this.originalRepo = this.project.repo;
        this.repo = this.project.repo;
        this.name = this.project.name;
        this.main = this.project.main;
      },
      createProject: function (callback) {
        var req = new XMLHttpRequest();
        req.onreadystatechange = function () {
          if (req.readyState !== 4) {
            return;
          }
          if (req.status !== 200 && req.status !== 201) {
            return callback(req.responseText);
          }
          return callback(null);
        };
        var payload = JSON.stringify({
          repo: this.repo,
          active: true
        });
        req.open('POST', 'https://api.flowhub.io/projects', true);
        req.setRequestHeader('Authorization', 'Bearer ' + this.token);
        req.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        req.send(payload);
      },
      updateProject: function () {
        this.project.graphs.forEach(function (graph) {
          if (graph.id === this.main && graph.properties.environment.runtime) {
            type = graph.properties.environment.runtime;
            this.project.mainGraph = graph;
          }
        }.bind(this));
        var type = this.project.type;
        this.fire('updated', {
          id: this.project.id,
          name: this.name,
          main: this.main,
          type: type,
          repo: this.repo
        });
        this.close();
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'saveProjectProperties');
        }
        if (!this.repo || this.originalRepo === this.repo) {
          // No repository changes, save as-is
          this.updateProject();
          return;
        }
        // Register repository as active
        this.errorText = '';
        this.createProject(function (err) {
          if (err) {
            this.errorText = err +
                '\nNote: You must create new repositories manually using [New Repository]';
            return;
          }
          this.updateProject();
        }.bind(this));
      },
      delete: function (event) {
        event.preventDefault();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'deleteProject');
        }
        this.fire('delete', this.project);
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-project-sync', {
      operation: {
        repo: '',
        push: [],
        pull: [],
        conflict: [],
        noop: []
      },
      statusText: '',
      chosen: {},
      hasPush: false,
      hasOp: true,
      message: '',
      operationChanged: function () {
        this.chosen = {};
        if (!this.operation.push.length && !this.operation.pull.length && !this.operation.conflict.length) {
          this.statusText = 'All changes have been synchronized';
          this.hasOp = false;
        }
        if (this.operation.push.length || this.operation.conflict.length) {
          this.hasPush = true;
        } else {
          this.hasPush = false;
        }
        this.operation.conflict.forEach(function (entry) {
          this.chosen[entry.path] = 'push';
        }.bind(this));
        this.operation.push.forEach(function (entry) {
          this.chosen[entry.path] = 'push';
        }.bind(this));
        this.operation.pull.forEach(function (entry) {
          this.chosen[entry.path] = 'pull';
        }.bind(this));
      },
      choose: function (event, detail, sender) {
        this.chosen[sender.name] = sender.value;
        var pushes = false;
        var ops = false;
        for (var name in this.chosen) {
          if (this.chosen[name] === 'push') {
            pushes = true;
            ops = true;
          }
          if (this.chosen[name] === 'pull') {
            ops = true;
          }
        }
        this.hasPush = pushes;
        this.hasOp = ops;
      },
      attached: function () {
        document.getElementById('container').classList.add('blur');
      },
      detached: function () {
        document.getElementById('container').classList.remove('blur');
      },
      send: function (event) {
        if (event) {
          event.preventDefault();
        }
        if (this.hasPush && !this.message) {
          return;
        }

        var originalConflicts = this.operation.conflict;
        var originalPushes = this.operation.push;
        var originalPulls = this.operation.pull;
        this.operation.conflict = [];
        this.operation.pull = [];
        this.operation.push = [];
        var checkOps = function (entry) {
          if (this.chosen[entry.path] === 'push') {
            this.operation.push.push(entry);
            return;
          }
          if (this.chosen[entry.path] === 'pull') {
            this.operation.pull.push(entry);
            return;
          }
        }.bind(this);
        originalConflicts.forEach(checkOps);
        originalPushes.forEach(checkOps);
        originalPulls.forEach(checkOps);
        this.operation.message = this.message;

        this.fire('sync', this.operation);
        this.close();
      },
      bgClick: function (event) {
        // Don't close if clicking within container
        event.stopPropagation();
      },
      close: function () {
        if (!this.parentNode) {
          return;
        }
        this.parentNode.removeChild(this);
      }
    });
  ;

    Polymer('noflo-project', {
      gridToken: '',
      project: null,
      runtimes: [],
      runtime: null,
      graph: null,
      component: null,
      canComponent: true,
      runtimeChanged: function () {
        if (this.runtime && this.runtime.definition && this.runtime.definition.capabilities) {
          this.canComponent = (this.runtime.definition.capabilities.indexOf('component:setsource') !== -1);
        }
      },
      newGraph: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-graph');
        dialog.project = this.project;
        dialog.runtimes = this.runtimes;
        document.body.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          var graph = event.detail;
          this.project.graphs.push(graph);
          this.fire('newgraph', graph);
          this.gotoGraph(graph.properties.id);
        }.bind(this));
      },
      newComponent: function (event) {
        if (!this.canComponent) {
          return;
        }
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        var dialog = document.createElement('noflo-new-component');
        dialog.project = this.project;
        document.body.appendChild(dialog);
        dialog.addEventListener('new', function (event) {
          var component = event.detail;
          this.project.components.push(component);
          this.fire('newcomponent', component);
          this.gotoComponent(component.name);
        }.bind(this));
      },
      openHome: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'openHome');
        }
        this.$.account.toggleOpen(false);
        window.location.hash = '#';
      },
      openSettings: function (event) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'projectProperties');
        }
        var dialog = document.createElement('noflo-project-inspector');
        dialog.token = this.gridToken;
        dialog.project = this.project;
        document.body.appendChild(dialog);
        dialog.addEventListener('updated', function (event) {
          Object.keys(event.detail).forEach(function (property) {
            this.project[property] = event.detail[property];
          }.bind(this));

          // Send only the data we actually want to store
          this.fire('changed', {
            id: this.project.id,
            name: this.project.name,
            repo: this.project.repo,
            type: this.project.type,
            main: this.project.main,
            graphs: [],
            components: []
          });
        }.bind(this));
        dialog.addEventListener('delete', function (event) {
          this.fire('deleteProject', event.detail);
        }.bind(this));
      },
      gotoGraph: function (id) {
        this.$.account.toggleOpen(false);
        window.location.hash = '#project/' + encodeURIComponent(this.project.id) + '/' + encodeURIComponent(id);
      },
      gotoComponent: function (id) {
        this.$.account.toggleOpen(false);
        window.location.hash = '#project/' + encodeURIComponent(this.project.id) + '/component/' + encodeURIComponent(id);
      },
      openGraph: function (event, detail, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'openGraph');
        }
        this.gotoGraph(sender.getAttribute('data-id'));
      },
      openComponent: function (event, detail, sender) {
        event.preventDefault();
        if (document.querySelectorAll('.modal-content:not(polymer-element)').length) {
          return;
        }
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'openComponent');
        }
        this.gotoComponent(sender.getAttribute('data-id'));
      },
      synchronize: function (event) {
        event.preventDefault();
        event.stopPropagation();
        if (typeof ga === 'function') {
          ga('send', 'event', 'button', 'click', 'syncGithub');
        }
        this.fire('sync', {
          repo: this.project.repo,
          project: this.project
        });
      },
      confirm: function (operation) {
        var dialog = document.createElement('noflo-project-sync');
        dialog.operation = operation;
        document.body.appendChild(dialog);
        dialog.addEventListener('sync', function (event) {
          if (typeof ga === 'function') {
            if (event.detail.push.length) {
              ga('send', 'event', 'button', 'click', 'pushGithub');
            }
            if (event.detail.pull.length) {
              ga('send', 'event', 'button', 'click', 'pullGithub');
            }
          }
          this.fire('syncDecision', event.detail);
        }.bind(this));
      }
    });
  ;

    Polymer('noflo-edge-menu', {
      edges: [],
      graph: null,
      routes: [0, 1, 2, 3, 4, 5, 6, 7, 9, 10],
      secure: false,
      edgesChanged: function () {
        if (!this.edges.length) {
          return;
        }
        this.secure = true;
        for (var i = 0; i < this.edges.length; i++) {
          if (!this.edges[i].metadata.secure) {
            this.secure = false;
            return;
          }
        }
      },
      clear: function (event) {
        event.preventDefault();
        var edge;
        while(this.edges.length) {
          edge = this.edges.pop();
          edge.selected = false;
        }
      },
      remove: function (event) {
        event.preventDefault();
        while(this.edges.length) {
          var edge = this.edges.pop();
          if (edge.parentNode) {
            edge.parentNode.removeChild(edge);
          }
        }
      },
      setRoute: function (event, detail, sender) {
        event.preventDefault();
        var route = parseInt(sender.getAttribute('name'), 10);
        this.graph.startTransaction('changeroute');

        this.edges.forEach(function (edge) {
          this.graph.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, {
            route: route
          });
        }.bind(this));

        this.graph.endTransaction('changeroute');
      },
      setSecure: function (event, detail, sender) {
        event.preventDefault();
        this.toggleSecure(true);
      },
      setUnsecure: function (event, detail, sender) {
        event.preventDefault();
        this.toggleSecure(false);
      },
      toggleSecure: function (secure) {
        this.graph.startTransaction('changesecure');
        this.edges.forEach(function (edge) {
          var meta = edge.metadata;
          meta.secure = secure;
          this.graph.setEdgeMetadata(edge.from.node, edge.from.port, edge.to.node, edge.to.port, meta);
        }.bind(this));
        this.graph.endTransaction('changesecure');
        this.secure = secure;
      }
    });
  ;

    Polymer('noflo-edge-inspector', {
      lastlog: 0,
      showlogs: 20,
      edge: null,
      log: null,
      graph: null,
      sourceNode: '',
      sourcePort: '',
      targetNode: '',
      targetPort: '',
      route: 0,
      frameReq: null,
      detached: function () {
        if (this.frameReq) {
          window.cancelAnimationFrame(this.frameReq);
        }
      },
      edgeChanged: function () {
        var src = this.edge.from;
        var tgt = this.edge.to;
        this.sourceNode = this.nodeLabel(src.node);
        this.sourcePort = src.port;
        this.targetNode = this.nodeLabel(tgt.node);
        this.targetPort = tgt.port;
        this.route = this.edge.metadata.route;
        this.animate();
      },
      nodeLabel: function (node) {
        var extractLibrary = node.split('/');
        if (extractLibrary.length > 1) {
          node = extractLibrary[1];
        }
        return node.split('_')[0];
      },
      clear: function () {
        this.log.clear();
        this.lastlog = 0;
        this.$.events.innerHTML = '';
      },
      animate: function () {
        if (!this.log) {
          return;
        }
        // TODO top-level animation loop
        this.frameReq = window.requestAnimationFrame(this.animate.bind(this));
        if (this.log.length <= this.lastlog) {
          return;
        }
        this.renderLogs();
        this.lastlog = this.log.length;
      },
      renderLogs: function () {
        var first = this.lastlog;
        var i, item, li, content;
        if (this.log.length - this.lastlog > this.showlogs) {
          first = this.log.length - this.showlogs;
        }
        var fragment = document.createDocumentFragment();
        for (i = first; i < this.log.length; i++) {
          item = this.log.get(i);
          if (!item) {
            continue;
          }
          li = document.createElement('li');
          li.classList.add(item.type);
          if (item.group) {
            content = document.createTextNode(item.group);
          } else {
            var cleaned = item.data;
            if (typeof item.data === 'object') {
              cleaned = JSON.stringify(item.data, null, 2);
              if (typeof item.data.type !== 'undefined' && item.data.type === 'previewurl') {
                var separator = (item.data.url.indexOf('?') !== -1) ? '&' : '?';
                content = document.createElement('img');
                content.src = item.data.url + separator + 'timestamp=' + new Date().getTime();
                content.classList.add('previewimg');
              } else {
                content = document.createTextNode(cleaned);
              }
            } else {
              content = document.createTextNode(cleaned);
            }
          }
          li.appendChild(content);
          fragment.appendChild(li);
        }
        this.$.events.appendChild(fragment);
        // Scroll to bottom
        while (this.$.events.childElementCount > this.showlogs) {
          this.$.events.removeChild(this.$.events.firstChild);
        }
        this.$.events.scrollTop = this.$.events.scrollHeight;
      }
    });
  ;

  (function () {
    function CircularBuffer(n, clearCallback) {
      this._array= new Array(n);
      this.length= 0;
      this.clearCallback = clearCallback;
    }
    CircularBuffer.prototype.toString= function() {
      return '[object CircularBuffer('+this._array.length+') length '+this.length+']';
    };
    CircularBuffer.prototype.get= function(i) {
      if (i<0 || i<this.length-this._array.length)
      return undefined;
      return this._array[i%this._array.length];
    };
    CircularBuffer.prototype.set = function(i, v) {
      if (i<0 || i<this.length-this._array.length)
      throw CircularBuffer.IndexError;
      while (i>this.length) {
        this._array[this.length%this._array.length] = undefined;
        this.length++;
      }
      this._array[i%this._array.length] = v;
      if (i==this.length)
      this.length++;
    };
    CircularBuffer.prototype.push = function(v) {
      this._array[this.length%this._array.length] = v;
      this.length++;
    };
    CircularBuffer.prototype.clear = function() {
      this._array = new Array(this._array.length);
      this.length = 0;
      if (this.clearCallback)
        this.clearCallback();
    };
    CircularBuffer.IndexError= {};

    Polymer('noflo-packets', {
      editor: null,
      logs: {},
      errorLogs: {},
      panel: null,
      runtime: null,
      edges: [],
      nodes: [],
      currentgraph: null,
      attached: function () {
        window.addEventListener('keyup', function (e) {
          if (e.keyCode === 27) {
            this.clearSelection();
          }
        }.bind(this));
      },
      clearSelection: function () {
        var edge, node;
        // Clear selections on Esc
        while (this.edges.length) {
          edge = this.edges.pop();
          edge.selected = false;
        }
        while (this.nodes.length) {
          node = this.nodes.pop();
          node.selected = false;
        }
      },
      runtimeChanged: function () {
        this.logs = {};
      },
      packet: function (packet) {
        if (!packet.edge) {
          return;
        }
        this.ensureLog(packet.edge);
        this.logs[packet.edge].push(packet);
      },
      processError: function (error) {
        if (!error.process) {
          return;
        }
        this.ensureErrorLog(error.process);
        this.errorLogs[error.process].push(error.message);

        this.editor.addErrorNode(error.process);
        if (this.nodeInspectors[error.process]) {
          var inspector = this.nodeInspectors[error.process].childNodes[0];
          inspector.error();
        }
     },
      updateEditorErrors: function () {
        this.editor.clearErrorNodes();
        for (var i in this.errorLogs) {
          if (this.errorLogs[i].length > 0)
            this.editor.addErrorNode(i);
        }
      },
      edgeInspectors: {},
      edgesChanged: function () {
        if (this.edges.length) {
          this.showEdgeCards();
        } else {
          this.hideEdgeCards();
        }
      },
      genEdgeId: function (edge) {
        var fromStr = edge.from.node + '() ' + edge.from.port.toUpperCase();
        var toStr = edge.to.port.toUpperCase() + ' ' + edge.to.node + '()';
        return fromStr + ' -> ' + toStr;
      },
      ensureLog: function (id) {
        if (this.logs[id]) {
          return;
        }
        this.logs[id] = new CircularBuffer(40);
      },
      showEdgeCards: function () {
        if (!this.edgeMenu) {
          var menu = document.createElement('noflo-edge-menu');
          menu.edges = this.edges;
          menu.graph = this.currentgraph;
          this.edgeMenu = document.createElement('the-card');
          this.edgeMenu.type = 'edge-menu';
          this.edgeMenu.dialog = menu;
          this.edgeMenu.appendChild(menu);
          this.edgeMenu.addTo(this.panel);
        } else {
          this.edgeMenu.dialog.edges = this.edges;
        }

        this.edges.forEach(function (edge) {
          var id = this.genEdgeId(edge);
          if (this.edgeInspectors[id]) {
            return;
          }
          this.ensureLog(id);
          var inspector = document.createElement('noflo-edge-inspector');
          inspector.edge = edge;
          inspector.log = this.logs[id];
          inspector.graph = this.currentgraph;
          this.edgeInspectors[id] = document.createElement('the-card');
          this.edgeInspectors[id].type = 'edge-inspector';
          this.edgeInspectors[id].appendChild(inspector);
          this.edgeInspectors[id].addTo(this.panel);
        }.bind(this));

        var found;
        Object.keys(this.edgeInspectors).forEach(function (id) {
          found = false;
          this.edges.forEach(function (edge) {
            if (this.genEdgeId(edge) === id) {
              found = true;
            }
          }.bind(this));
          if (!found) {
            this.edgeInspectors[id].parentNode.removeChild(this.edgeInspectors[id]);
            delete this.edgeInspectors[id];
          }
        }.bind(this));
      },
      hideEdgeCards: function () {
        if (this.edgeMenu) {
          this.edgeMenu.parentNode.removeChild(this.edgeMenu);
          this.edgeMenu = null;
        }
        for (var id in this.edgeInspectors) {
          this.edgeInspectors[id].parentNode.removeChild(this.edgeInspectors[id]);
          delete this.edgeInspectors[id];
        }
      },
      nodesChanged: function () {
        if (this.nodes.length) {
          this.showNodeCards();
        } else {
          this.hideNodeCards();
        }
      },
      ensureErrorLog: function (id) {
        if (this.errorLogs[id]) {
          return;
        }
        this.errorLogs[id] = new CircularBuffer(40,
                                                this.updateEditorErrors.bind(this));
      },
      nodeInspectors: {},
      showNodeCards: function () {
        this.nodes.forEach(function (node) {
          var id = node.id;
          if (this.nodeInspectors[id]) {
            return;
          }
          this.ensureErrorLog(id);
          var inspector = document.createElement('noflo-node-inspector');
          inspector.node = node;
          inspector.component = this.editor.getComponent(node.component);
          inspector.graph = this.currentgraph;
          inspector.errorLog = this.errorLogs[id];
          this.nodeInspectors[id] = document.createElement('the-card');
          this.nodeInspectors[id].type = 'node-inspector';
          this.nodeInspectors[id].appendChild(inspector);
          this.nodeInspectors[id].addTo(this.panel);
        }.bind(this));

        var found;
        Object.keys(this.nodeInspectors).forEach(function (id) {
          found = false;
          this.nodes.forEach(function (node) {
            if (node.id === id) {
              found = true;
            }
          });
          if (!found) {
            this.nodeInspectors[id].parentNode.removeChild(this.nodeInspectors[id]);
            delete this.nodeInspectors[id];
          }
        }.bind(this));
      },
      hideNodeCards: function () {
        for (var id in this.nodeInspectors) {
          this.nodeInspectors[id].parentNode.removeChild(this.nodeInspectors[id]);
          delete this.nodeInspectors[id];
        }
      },
    });
  })();
;

    // _hack_ -> https://github.com/Polymer/polymer/issues/651
    Polymer('noflo-alert', {
      message: "",
      isError: false,
      offerHTTPS: false,
      isErrorChanged: function () {
        if (this.isError) {
          this.classList.add('error');
        } else {
          this.classList.remove('error');
        }
      }
    });
  ;

    Polymer('noflo-ui', {
      width: window.innerWidth,
      height: window.innerHeight,
      ctx: {},
      dontAutoHideAlert: false,
      ready: function () {
        this.$.main.addEventListener('logout', function (event) {
          this.fire('user:logout', true);
        }.bind(this));
        this.$.main.addEventListener('login', function (event) {
          this.fire('user:loginFree', true);
        }.bind(this));
        this.$.main.addEventListener('login', function (event) {
          this.fire('user:loginFree', true);
        }.bind(this));
        this.$.main.addEventListener('relogin', function (event) {
          if (event.detail !== 'free') {
            this.fire('user:loginPro', true);
            return;
          }
          this.fire('user:loginFree', true);
        }.bind(this));
        this.$.main.addEventListener('fetchRemote', function (event) {
          this.fire('github:fetch', event.detail);
        }.bind(this));
        this.$.main.addEventListener('downloadProject', function (event) {
          this.fire('project:save:project', event.detail.project);
          setTimeout(function () {
            this.fire('github:sync:pull', {
              repo: event.detail.project.repo,
              project: event.detail.project
            });
            this.$.main.projects.push(event.detail.project);
            this.$.main.checkProject(event.detail.project);
            this.ctx.projects.push(event.detail.project);
          }.bind(this), 2);
        }.bind(this));
        this.$.main.addEventListener('newgraph', function (event) {
          this.fire('project:save:graph', event.detail);
        }.bind(this));
        this.$.main.addEventListener('runtime', function (event) {
          this.fire('project:save:runtime', event.detail);
        }.bind(this));
        this.$.main.addEventListener('newproject', function (event) {
          this.fire('project:save:project', event.detail);
          this.ctx.projects.push(event.detail);
          setTimeout(function () {
            window.location.hash = '#project/' + encodeURIComponent(event.detail.id) + '/' + encodeURIComponent(event.detail.main);
          }, 2);
        }.bind(this));
        this.$.context.addEventListener('newgraph', function (event) {
          this.fire('project:save:graph', event.detail);
          this.fire('runtime:sendGraph', event.detail);
        }.bind(this));
        this.$.runtime.addEventListener('runtime', function (event) {
          var newCtx = {};
          for (var key in this.ctx) {
            newCtx[key] = this.ctx[key];
          }
          newCtx.runtime = event.detail;
          this.fire('runtime:connect', newCtx);
        }.bind(this));
        this.$.runtime.addEventListener('changed', function (event) {
          this.fire('project:save:runtime', event.detail);
        }.bind(this));
        this.$.grapheditor.addEventListener('edges', function (event) {
          this.fire('context:edges', event.detail);
        }.bind(this));
        this.$.grapheditor.addEventListener('nodes', function (event) {
          this.fire('context:nodes', event.detail);
        }.bind(this));
        this.$.project.addEventListener('changed', function (event) {
          this.fire('project:save:project', event.detail);
        }.bind(this));
        this.$.project.addEventListener('newgraph', function (event) {
          this.fire('project:save:graph', event.detail);
          this.fire('runtime:sendGraph', event.detail);
          this.triggerTests();
        }.bind(this));
        this.$.project.addEventListener('newcomponent', function (event) {
          this.fire('project:save:component', event.detail);
          this.fire('runtime:sendComponent', event.detail);
        }.bind(this));
        this.$.project.addEventListener('sync', function (event) {
          this.fire('github:sync:prepare', event.detail);
        }.bind(this));
        this.$.project.addEventListener('syncDecision', function (event) {
          this.fire('github:sync:synchronize', event.detail);
        }.bind(this));
        this.$.project.addEventListener('deleteProject', function (event) {
          window.location.hash = '#';
          event.detail.graphs.forEach(function (graph) {
            this.fire('project:delete:graph', graph);
          }.bind(this));
          event.detail.components.forEach(function (component) {
            this.fire('project:delete:component', component);
          }.bind(this));
          event.detail.specs.forEach(function (spec) {
            this.fire('project:delete:spec', spec);
          }.bind(this));
          this.fire('project:delete:project', event.detail);
          this.$.main.projects.splice(this.$.main.projects.indexOf(event.detail), 1);
          this.$.main.localProjects.splice(this.$.main.localProjects.indexOf(event.detail), 1);
        }.bind(this));
        this.$.main.addEventListener('deleteProject', function (event) {
          window.location.hash = '#';
          event.detail.graphs.forEach(function (graph) {
            this.fire('project:delete:graph', graph);
          }.bind(this));
          event.detail.components.forEach(function (component) {
            this.fire('project:delete:component', component);
          }.bind(this));
          event.detail.specs.forEach(function (spec) {
            this.fire('project:delete:spec', spec);
          }.bind(this));
          this.fire('project:delete:project', event.detail);
          this.$.main.projects.splice(this.$.main.projects.indexOf(event.detail), 1);
          this.$.main.localProjects.splice(this.$.main.localProjects.indexOf(event.detail), 1);
        }.bind(this));
        this.$.componenteditor.addEventListener('changed', function (event) {
          this.fire('project:save:component', event.detail);
          this.fire('runtime:sendComponent', event.detail);
          this.triggerTests();
        }.bind(this));
        this.$.componenteditor.addEventListener('specschanged', function (event) {
          this.fire('project:save:spec', event.detail);
          this.triggerTests();
        }.bind(this));
        this.$.search.addEventListener('search:library', function (event) {
          this.fire('context:search_library', event.detail);
        }.bind(this));
        this.$.search.addEventListener('search:graph', function (event) {
          this.fire('context:search_graph', event.detail);
        }.bind(this));
        this.$.library.addEventListener('result', function (event) {
          this.fire('context:search_library_result', {
            searchLibraryResult: event.detail
          });
        }.bind(this));
        this.$.search.addEventListener('deleteGraph', function (event) {
          var project = this.ctx.project || this.$.project.project;
          if (project && project.graphs.indexOf(event.detail) !== -1) {
            project.graphs.splice(project.graphs.indexOf(event.detail), 1);
          }
          this.fire('project:delete:graph', event.detail);
          if (!project.graphs.length && !project.components.length) {
            // Empty project, remove
            this.fire('project:delete:project', project);
            this.$.main.projects.splice(this.$.main.projects.indexOf(project), 1);
            this.$.main.localProjects.splice(this.$.main.localProjects.indexOf(project), 1);
            // Go home
            window.location.hash = '#';
          } else if (project.graphs[0]) {
            // Go to first graph
            window.location.hash = '#project/' + encodeURIComponent(project.id) + '/' + encodeURIComponent(project.graphs[0].properties.id);
          } else if (project.components[0]) {
            // Go to first component
            window.location.hash = '#project/' + encodeURIComponent(project.id) + '/component/' + encodeURIComponent(project.components[0].name);
          }
        }.bind(this));
        this.$.search.addEventListener('deleteComponent', function (event) {
          var project = this.ctx.project || this.$.project.project;
          if (!project || !project.components) {
            return;
          }
          var component = event.detail;
          var index = project.components.indexOf(component);
          if (index !== -1) {
            project.components.splice(index, 1);
          }
          this.fire('project:delete:component', component);
          if (!project.graphs.length && !project.components.length) {
            // Empty project, remove
            this.fire('project:delete:project', project);
            this.$.main.projects.splice(this.$.main.projects.indexOf(project), 1);
            this.$.main.localProjects.splice(this.$.main.localProjects.indexOf(project), 1);
            // Go home
            window.location.hash = '#';
          } else if (project.components[0]) {
            // Go to first component
            window.location.hash = '#project/' + encodeURIComponent(project.id) + '/component/' + encodeURIComponent(project.components[0].name);
          } else if (project.graphs[0]) {
            // Go to first graph
            window.location.hash = '#project/' + encodeURIComponent(project.id) + '/' + encodeURIComponent(project.graphs[0].properties.id);
          }
        }.bind(this));
        this.$.search.addEventListener('specschanged', function (event) {
          this.fire('project:save:spec', event.detail);
          this.triggerTests();
        }.bind(this));
        this.$.library.editor = this.$.grapheditor;
        this.$.journal.editor = this.$.grapheditor;
        this.$.context.editor = this.$.grapheditor;
        this.$.packets.editor = this.$.grapheditor;
        this.$.search.editor = this.$.grapheditor;
        this.$.runtime.panel = this.$.context.$.fixed;
        this.$.packets.panel = this.$.context.$.context;
        this.$.search.panel = this.$.context.$.context;
      },
      attached: function () {
        // Offer HTTPS
        if (window.location.origin === 'http://app.flowhub.io') {
          this.showProgress({
            offerHTTPS: true,
            dontAutoHideAlert: true
          });
        }
      },
      context: function (context) {
        if (context.state) {
          switch (context.state) {
            case 'error':
              this.showError(context);
              break;
            case 'ok':
              this.hideAlertSoon();
              break;
            case 'loading':
              this.showProgress(context);
              break;
          }
        }
        for (var key in context) {
          this.ctx[key] = context[key];
        }
        if (context.projects) {
          this.$.main.projects = context.projects;
        }
        if (context.db) {
          this.$.journal.db = context.db;
        }
        if (context.runtimes) {
          this.$.main.runtimes = context.runtimes;
          this.$.project.runtimes = context.runtimes;
          this.$.search.runtimes = context.runtimes;
        }
        if (context.search !== undefined) {
          this.$.library.search({
            search: this.ctx.search
          });
        }
        if (context.searchLibraryResult) {
          this.$.search.libraryResults(this.ctx.searchLibraryResult);
        }
        if (context.searchGraphResult) {
          this.$.search.graphResults(this.ctx.searchGraphResult);
        }
        if (this.ctx.edges !== undefined) {
          this.$.packets.edges = this.ctx.edges;
        }
        if (this.ctx.error) {
          this.$.packets.processError(this.ctx.error);
          this.ctx.error = null;
        }
        if (this.ctx.packet) {
          this.$.packets.packet(this.ctx.packet);
          this.ctx.packet = null;
        }
        if (this.ctx.nodes !== undefined) {
          this.$.context.nodes = this.ctx.nodes;
          this.$.packets.nodes = this.ctx.nodes;
        }
        if (context.nodes || context.edges) {
          return;
        }
        if (context.syncOperation !== undefined) {
          this.$.project.confirm(context.syncOperation);
          return;
        }
        if (context.remoteProjects !== undefined) {
          this.$.main.githubProjects(context.remoteProjects);
          return;
        }
        if (this.ctx.clearLibrary) {
          for (var libKey in this.$.grapheditor.$.graph.library) {
            delete this.$.grapheditor.$.graph.library[libKey];
          }
          delete this.ctx.clearLibrary;
        }
        if (this.ctx.componentDefinition !== undefined && this.ctx.componentDefinition) {
          this.$.grapheditor.registerComponent(this.ctx.componentDefinition);
          this.ctx.componentDefinition = null;
        }
        if (this.ctx.runtime !== undefined) {
          this.$.runtime.runtime = this.ctx.runtime;
          this.$.context.runtime = this.ctx.runtime;
        }
        if (this.ctx.suites) {
          this.$.runtime.showTests(this.ctx.suites);
        }
        if (this.ctx.state === 'loading') {
          return;
        }
        if (this.ctx.state === 'error') {
          this.showError(this.ctx);
          return;
        }
        if ((this.ctx.graphs && this.ctx.graphs.length) || this.ctx.component) {
          this.$.main.open = false;
        } else {
          this.$.main.open = true;
        }
        if (this.ctx.graphs && this.ctx.graphs.length) {
          var oldGraph = this.$.grapheditor.graph;
          this.$.grapheditor.graph = this.ctx.graphs[this.ctx.graphs.length - 1];
          this.$.project.graph = this.ctx.graphs[this.ctx.graphs.length - 1];
          this.$.packets.currentgraph = this.ctx.graphs[this.ctx.graphs.length - 1];
          this.$.journal.graph = this.ctx.graphs[this.ctx.graphs.length - 1];
          this.$.runtime.graph = this.ctx.graphs[0];
          if (oldGraph !== this.$.grapheditor.graph) {
            setTimeout(function () {
              this.fire('context:graph', {
                graph: this.$.grapheditor.graph
              });
            }.bind(this), 1);
          }
        } else {
          this.$.project.graph = null;
          this.$.journal.graph = null;
          this.$.runtime.graph = null;
        }
        if (this.ctx.graphs) {
          this.$.context.graphs = this.ctx.graphs;
          this.$.library.graphs = this.ctx.graphs;
          this.$.project.graphs = this.ctx.graphs;
          this.$.search.graphs = this.ctx.graphs;
        }
        this.$.context.project = this.ctx.project;
        this.$.context.runtime = this.ctx.runtime;
        this.$.project.component = this.ctx.component;
        this.$.project.project = this.ctx.project;
        this.$.componenteditor.component = this.ctx.component;
        this.$.componenteditor.project = this.ctx.project;
        this.$.search.component = this.ctx.component;
        this.$.search.project = this.ctx.project;
        this.$.runtime.runtimes = this.ctx.compatibleRuntimes;
        this.$.runtime.runtime = this.ctx.runtime;
      },
      user: function (user) {
        this.$.main.githubToken = user['github-token'];
        this.$.main.gridToken = user['grid-token'];
        this.$.main.user = user['grid-user'];
        if (user['grid-avatar']) {
          this.$.main.avatar = user['grid-avatar'];
        }
        this.$.main.plan = user['flowhub-plan'];
        this.$.project.gridToken = user['grid-token'];
      },
      showError: function (context) {
        if (context.error && context.error.message) {
          this.$.alert.message = context.error.message;
          this.$.alert.isError = true;
          this.$.alert.offerHTTPS = false;
          this.$.alert.classList.add('show');
        }
      },
      showProgress: function (context) {
        if (context.state || context.offerHTTPS) {
          this.$.alert.message = context.state || "";
          this.$.alert.isError = false;
          this.$.alert.offerHTTPS = context.offerHTTPS || false;
          this.dontAutoHideAlert = context.dontAutoHideAlert || false;
          this.$.alert.classList.add('show');
        }
      },
      triggerTests: function () {
        this.fire('runtime:runTests', this.ctx.project || this.$.project.project);
      },
      hideAlert: function () {
        this.$.alert.classList.remove('show');
      },
      hideAlertSoon: function () {
        if (this.dontAutoHideAlert) { return; }
        window.setTimeout(function(){
          this.hideAlert();
        }.bind(this), 1300);
      }
    });
  ;

    Polymer('noflo-polymer', {
    });
  