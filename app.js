var express = require('express')
  // , routes = require('./routes')
  , http = require('http');

var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
var bitnami = require('./lib/bitnami.js');

var instanceData;

app.configure(function() {
  app.use(express.static(__dirname + '/dist'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
});

// app.get('/', routes.index);
app.get('/', function (req, res) {
  res.sendfile(__dirname + '/dist/index.html');
});

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('formSubmission', function(data) {
    // pass in keys to authentication settings with AWS
    bitnami.init({
      accessKeyId: data.accessKeyId,
      secretAccessKey: data.secretAccessKey
    })

    // bitnami.launchInstance('bitnami security group', 'bitnamiDemo', function(err, data) {
    //   if(err) {
    //     console.log(err);
    //   } else {
    //     instanceData = data;
    //     console.log('instanceData is', instanceData);
    //     updateClient(instanceData);
    //   }
    // });

    bitnami.checkInstanceStatus('i-6c06e74f', function (err, data) {
      if(err) {
        console.log('Error:', err);
      } else {
        console.log('Instance Status 2:', data);
        socket.emit('instance data status', data);
      }
    })
  });
});

/**
*
* Update the client with times when the AMI will be ready
*
**/

function updateClient(instanceData) {
  console.log('should start updating the client here....');

  // check the status of the instance
  var status = bitnami.checkInstanceStatus(instanceData, function(err, data) {
    if(err) {
      console.log(err);
    } else {
      console.log(data);
      return data;
    }
  });


}

// console.log("Express server listening on port 3000");
