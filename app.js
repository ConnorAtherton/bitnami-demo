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

    console.log('Should launch the instance now');

    bitnami.launchInstance('bitnami demo security group', 'BITNAMIDEMO', function(err, data) {
      if(err) {
        return console.log(err);
      } else {
        instanceData = data;

        console.log('The instance should have been created by now', data)

        intervalId = setInterval(function() {
          updateClient(instanceData, socket);
        }, 2000); // poll every second
      }
    });

    // intervalId = setInterval(function() {
    //   updateClient('i-11826232', socket);
    // }, 2000); // poll every second
  });

  // Used to stop the servers
  socket.on('stopInstance', function(data) {
    console.log('Should be stopping the instance right about now', data.instanceId);
    bitnami.stopInstance(data.instanceId, function(err, data) {
      if(err) return console.log(err);

      socket.emit('state', { state: 'terminated' });
    });
  });
});

/**
*
* Update the client with times when the AMI will be ready
*
**/

function updateClient(instanceData, socket) {

  console.log('Updating the client', instanceData);

  // check the status of the instance
  bitnami.checkInstanceStatus(instanceData, function(err, data) {
    if(err) console.log(err);

    console.log('CHECK INSTANCE STATUS', data);

    socket.emit('state', data);

    if (data['InstanceStatuses'].length === 0) {
      // for some reason we have to wait a long time for
      // describeInstanceStatus() to return something
      // once a new instance has been created
      console.log('Return and wait to try again...');
      return;
    };

    // if the instance is running...
    if(data['InstanceStatuses'][0]['InstanceState']['Name'] === 'running') {
      // emit the socket state event that it is running and supply the link
      // and instance id so it can be stopped
      console.log('STATE: IT IS RUNNING');

      // REMOVE THIS!!
      socket.emit('state', {
        state: data['InstanceStatuses'][0]['InstanceState']['Name'],
        availibility: data['InstanceStatuses'][0]['InstanceStatus']['Status'],
        id: data['InstanceStatuses'][0]['InstanceId']
      });

      // not only does the server have to be running
      // but it must also be reachable, if it isn't we
      // keep waiting
      if (data['InstanceStatuses'][0]['InstanceStatus']['Status'] === 'ok') {
        console.log('INSTANCE REACHABLE!!');

        // this needs to be here or else data is replaced by the locally scoped
        // data in agetPublicDNS() nd we get a ReferenceError
        var status = data;

        // this is a bit of a hack but we need to get the publicDNS so we can link
        // it in the application. We could have checked earlier but it isn't available
        // through the API until the instance is actually running.

        bitnami.getPublicDNS(instanceData, function(err, data) {
          if(err) return console.log(err);

          console.log('The public dns is', data['Reservations'][0]['Instances'][0]['PublicDnsName']);

          socket.emit('state', {
            state: status['InstanceStatuses'][0]['InstanceState']['Name'],
            availibility: status['InstanceStatuses'][0]['InstanceStatus']['Status'],
            link: data['Reservations'][0]['Instances'][0]['PublicDnsName'],
            id: status['InstanceStatuses'][0]['InstanceId']
          });
        });

        // stop the interval because our server is running
        clearInterval(intervalId);
      };

    } else {
      console.log('STATE: IT IS NOT RUNNING');
      socket.emit('state', { state: data['Reservations'][0]['Instances'][0]['State']['Name'] });
    }
  });

}

// console.log("Express server listening on port 3000");
