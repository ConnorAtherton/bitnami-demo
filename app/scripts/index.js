$(function() {
  'use strict';

  var socket = io.connect('http://localhost');
  socket.on('news', function (data) {
    console.log(data);
  });
  // socket.on('instance data status', function (data) {
  //   console.log('state data', data['Reservations'][0]['Instances'][0]['State']);
  // });
  socket.on('state', function(data) {
    console.log('State data:', data);
    if(data.state === 'running') {

      if(data.availibility === 'ok')
        instanceRunning(data);

      if(data.availibility === 'initializing')
        console.log('still initializing...');
        // Do nothing as we are already initialising
        // instanceInitializing(data);

    } else if(data.state === 'terminated') {
      instanceTerminated();
    } else if(data.state === 'pending'){
      // Do nothing as we are already initialising
      // instanceInitializing(data);
    }
  })

  var $submit = null,
      $form = null,
      $container = $("#container");

    var initialForm = $('#initialForm').html(),
        serverInitializing = $('#serverInitializing').html(),
        serverReady = $('#serverReady').html(),
        serverStopped = $('#serverStopped').html();

    var initialFormTemplate = Handlebars.compile(initialForm),
        serverInitializingTemplate = Handlebars.compile(serverInitializing),
        serverReadyTemplate = Handlebars.compile(serverReady),
        serverStoppedTemplate = Handlebars.compile(serverStopped);

    // render the first template
    $container.html(initialFormTemplate());
    $submit = $('#createAMI');
    $form = $('form');

    $submit.on('click', function(e) {
      e.preventDefault();
      // add some parsley validation
      // gather up form data
      var data = $form.serializeObject();
      console.log('Credentials object', data);
      // send through websockets
      sendCredentials(data);
    });

  function sendCredentials(data) {
    socket.emit('formSubmission' , data);
    // remove the first block to
    // show that we have moved on to the
    // next step
    instanceInitializing();
  }

  // taken from this object
  // http://stackoverflow.com/questions/1184624/convert-form-data-to-js-object-with-jquery
  // I wanted to avoid trouble using JSON.parse() on a malformed string which
  // happens a lot when using jQuery's serialize()
  $.fn.serializeObject = function() {
      var o = {};
      var a = this.serializeArray();
      $.each(a, function() {
          if (o[this.name] !== undefined) {
              if (!o[this.name].push) {
                  o[this.name] = [o[this.name]];
              }
              o[this.name].push(this.value || '');
          } else {
              o[this.name] = this.value || '';
          }
      });
      return o;
  };

  function instanceInitializing(data) {
    $container.html(serverInitializingTemplate());
    console.log('instance is initializing')
  }

  function instanceRunning(data) {
    $container.html(serverReadyTemplate(data));
    $('#stopServer').on('click', function() {
      var id = $(this).attr('data-id');
      socket.emit('stopInstance', { instanceId: id });
    })
    console.log('instance is running');
  }

  function instanceTerminated(data) {
    $container.html(serverStoppedTemplate());
    $('#restart').on('click', function() {
      window.location.reload();
    })
    console.log('instance has been terminated for good.....');
  }


})
