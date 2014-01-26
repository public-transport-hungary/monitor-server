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
             interval: -1,
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
    var id = ( req.headers[ "x-real-ip" ]||req.connection.remoteAddress ) + ":1111";
    if( !server.hosts[ id ] ){
      server.createReactors( id );
    }
    var reactors = server.hosts[ id ];
    var buffer = "";
    req.on( "data", function( b ){
      buffer += b;
    })
    req.on( "end", function( b ){
        if( b ){
          buffer += b;
        }
        var json = JSON.parse( buffer );
        json.forEach(function( row ){
          var events = [];
          for( var i = 0; i < row.values.length; i++ ){
            events.push({
              state: "ok",
              host: row.host,
              service: [ "collectd", row.type, row.dsnames[i] + "_" + row.dstypes[ i ] ].join( "/" ),
              metric: row.values[i],
              time: row.time*1000,
              tags: [],
              description: ""
            });
          }
          events.forEach(function( ev ){
            reactors.forEach(function( reactor ){
              var clone = godot.common.clone( ev );
              console.log( clone );
              reactor.source.write( clone );
            });
          });
        });
        res.end( "" );
    });
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