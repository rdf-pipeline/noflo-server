# noflo-server
 A stand alone Web server for modifying a single NoFlo Graph

## Development of NoFlo UI

Only necessary if you want to hack on NoFlo UI itself. Not neccesary for making apps with FBP.
To be able to work on the NoFlo UI you need a checkout of this repository and a working [Node.js](http://nodejs.org/) installation. Go to the checkout folder and run:

    $ npm install

Start the server, then open the URL it in a web browser. Example:

    $ node src/noflo-server.js --port 3005

Where 3005 is the port you want the server to run. Once it is built and the server is running you can access the UI at `http://localhost:3005/`

In addition to this project, the other repository of interest is the [the-graph](https://github.com/the-grid/the-graph) graph editor widget used for editing flows.


