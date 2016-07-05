# noflo-server
 A stand alone Web server for modifying a single NoFlo Graph

## Development of NoFlo UI

Only necessary if you want to hack on NoFlo UI itself. Not neccesary for making apps with FBP.
To be able to work on the NoFlo UI you need a checkout of this repository and a working [Node.js](http://nodejs.org/) installation. Go to the checkout folder and run:

    $ npm install

You also need the [Grunt](http://gruntjs.com/) build tool:

    $ sudo npm install -g grunt-cli

Alternatively, if you dislike installing globally:

    $ npm install grunt-cli
    $ export PATH=$PWD/node_modules/.bin:$PATH
    $ type -p grunt-cli ## $PWD/node_modules/.bin/node-cli
    $ grunt-cli --version
    grunt-cli v1.2.0
    grunt v0.4.5

Your versions might (eventually) vary. Note that some authors advise that if your dependencies get completely bolixed, you can delete `node_modules/**` and start again.
If you do, you'll need to explicitly reinstall `grunt-cli`.


This will provide you with all the needed development dependencies. Now you can build a new version by running:

    $ grunt build

You have to run this command as an administrator on Windows.

If you prefer, you can also start a watcher process that will do a rebuild whenever one of the files changes:

    $ grunt watch

Start the server, then open the URL it in a web browser. Example:

    $ node src/noflo-server.js --port 3005

Where 3005 is the port you want the server to run. Once it is built and the server is running you can access the UI at `http://localhost:3005/`

In addition to this project, the other repository of interest is the [the-graph](https://github.com/the-grid/the-graph) graph editor widget used for editing flows.


