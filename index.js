var godot = require( "godot" );
var nconf = require( "nconf" );
var OpsGenieReactor = require( "godot-opsgenie" );
nconf
  .argv()
  .defaults({
    graphite: {
        url: "",
        prefix: "xxxx.godot",
    },
    port: 1337,
    httpPort: 1338,
    host: "localhost",
    protocol: "udp",
    multiplex: false
});

var server = godot.createServer({
    type: nconf.get( "protocol" ),
    multiplex: Boolean( nconf.get( "multiplex" ) ),
       reactors: [
         godot.reactor()
           .graphite({
             url: nconf.get( "graphite:url" ),
             prefix: nconf.get( "graphite:prefix" )
            })
           .console(),
        godot.reactor()
            .where( "service", "elasticsearch/health/healtcheck" )
            .change( "state" )
            .opsgenie({
                customerKey: nconf.get( "opsgenie:customerKey" )
            })
            .console()

       ]
});

function onError( err ){
  console.error( "Error occured %s - %s", err.message, err.stack );
}
server
    .on( "error", onError )
    .listen( nconf.get( "port" ), nconf.get( "host" ), function( err ){
        if( !err ){
          console.info( "Godot server is listening on port %s", server.port  );
        }
      });

var http = require( "http" )
var httpServer = http.createServer(function( req, res ){
  if( req.method === "POST" ){
    req.pipe( process.stdout, { encoding: "utf8", end: false } );
    req.on( "end", function(){
        process.stdout.write( "\n" );
        res.end( "" );
    })
    //server._onTcpSocket( req );
    return;
  }
  res.end( "beep boop" );
});

httpServer
  .on( "error", onError )
  .listen( nconf.get( "httpPort" ), function( err ){
    if( !err ){
      console.info( "Godot http server is listening on port %s", httpServer.address().port  );
    }
});