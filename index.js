var godot = require( "godot" );
var nconf = require( "nconf" );
var OpsGenieReactor = require( "godot-opsgenie" );
nconf.defaults({
    graphite: {
        url: ""
        prefix: "xxxx.godot",
    },
    port: 1337,
    host: "localhost"
}).argv();

var server = godot.createServer({
    type: "udp",
    multiplex: false,
       reactors: [
         godot.reactor()
           .graphite({
             url: nconf.get( "graphite:url" ),
             prefix: nconf.get( "graphite:prefix" )
            }),
           .console(),
        godot.reactor()
            .where( "service", "elasticsearch/health/healtcheck" )
            .change( "state" )
            .opsgenie({
                customerKey: nconf.get( "opsgenie.customerKey" )
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
