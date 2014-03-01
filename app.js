var express = require('express')
  // , routes = require('./routes')
  , http = require('http');

var app = express();
var server = app.listen(3000);
var io = require('socket.io').listen(server);
var bitnami = require('./lib/bitnami.js');
var intervalId;
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
    });

    bitnami.launchInstance('bitnami security group', 'bitnamiDemo', function(err, data) {
      if(err) {
        return console.log(err);
      } else {
        instanceData = data;
        console.log('Instance id is', instanceData);

        intervalId = setInterval(function() {
          updateClient(instanceData, socket);
        }, 2000); // poll every second
      }
    });

    // intervalId = setInterval(function() {
    //   updateClient('i-6c06e74f', socket);
    // }, 2000); // poll every half second
  });
});

/**
*
* Update the client with times when the AMI will be ready
*
**/

function updateClient(instanceData, socket) {

  // check the status of the instance
  bitnami.checkInstanceStatus(instanceData, function(err, data) {
    if(err) console.log(err);

    // if the instance is running...
    if(data['Reservations'][0]['Instances'][0]['State']['Name'] === 'running') {
      // emit the socket state event that it is running and supply the link
      // and instance id so it can be stopped
      console.log('STATE: IT IS RUNNING');
      socket.emit('state', {
        state: data['Reservations'][0]['Instances'][0]['State']['Name'],
        link: data['Reservations'][0]['Instances'][0]['PublicDnsName'],
        id: data['Reservations'][0]['Instances'][0]['InstanceId']
      });
      // stop the interval because our server is running
      clearInterval(intervalId);
    } else {
      console.log('STATE: IT IS NOT RUNNING');
      socket.emit('state', { state: data['Reservations'][0]['Instances'][0]['State']['Name'] });
    }
  });

}

// console.log("Express server listening on port 3000");
