// should be inside a function
'use strict';

var socket = io.connect('http://localhost');
socket.on('news', function (data) {
  console.log(data);
});
socket.on('instance data status', function (data) {
  console.log(data);
});

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


$(function() {
  var $submit = $('#createAMI'),
      $form = $('form'),
      $block1 = $('.block-1'),
      $block2 = $('.block-2'),
      $block3 = $('.block-3');

  // hide the last two blocks to start with
  $block2.hide();
  $block3.hide();

  $submit.on('click', function(e) {
    e.preventDefault();

    // add some parsley validation

    // gather up form data
    var data = $form.serializeObject();
    // send through websockets
    sendCredentials(data);
  });
});

function sendCredentials(json) {
  socket.emit('formSubmission' , json);
}
