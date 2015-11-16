# noflo-server
 A stand alone Web server for modifying a single NoFlo Graph

## Development

To be able to work on the NoFlo UI you need a checkout of this repository and a working [Node.js](http://nodejs.org/) installation. Go to the checkout folder and run:

    $ npm install

You also need the [Grunt](http://gruntjs.com/) build tool:

    $ sudo npm install -g grunt-cli

This will provide you with all the needed development dependencies. Now you can build a new version by running:

    $ grunt build

You have to run this command as an administrator on Windows.

If you prefer, you can also start a watcher process that will do a rebuild whenever one of the files changes:

    $ grunt watch

Start the server, then open the URL it in a web browser. Example:

    $ node src/noflo-server.js --port 3005

Where 3005 is the port you want the server to run. Once it is built and the server is running you can access the UI at `http://localhost:3005/`

In addition to this project, the other repository of interest is the [the-graph](https://github.com/the-grid/the-graph) graph editor widget used for editing flows.

