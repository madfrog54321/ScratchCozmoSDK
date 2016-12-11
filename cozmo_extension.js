(function(ext) {

  var socket = null;
  var finishedTask = false;
  var status = {
    connected: false,
    robot: false,
    shutdown: false
  };

  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {};

  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function() {
    socket.send('status');
    if(!status.connected)
      return {status: 0, msg: 'Cozmo controller not found'}
    else if(!status.robot)
      return {status: 1, msg: 'Cozmo not found'}
    else
      return {status: 2, msg: 'Cozmo connected'};
  };

  ext.speak = function(data, callback) {
    if (status.connected){
      socket.send('.say_text("' + data + '").wait_for_completed()');
      ext.waitForCommandComplete(callback);
    }else {callback();}
  };

  ext.turn = function(data, callback) {
    if (status.connected){
      socket.send('.turn_in_place(degrees(' + data + ')).wait_for_completed()');
      ext.waitForCommandComplete(callback);
    }else {callback();}
  };

  ext.waitForCommandComplete = function(callback){
      console.log('waiting');
      var cb = callback;
      var loop = function() {
        if(finishedTask){
          finishedTask = false;
          console.log('done');
          cb();
        }
        else
          setTimeout(loop, 10);
      };
      setTimeout(loop, 10);
  };

  ext.drive = function(dis, speed, callback) {
    if (status.connected){
      socket.send('.drive_straight(distance_mm(' + dis + '), speed_mmps(' + speed + ')).wait_for_completed()');
      ext.waitForCommandComplete(callback);
    }else {callback();}
  };

  ext.drivePower = function(left, right, callback) {
    if (status.connected){
      socket.send('.drive_wheels(' + left + ', ' + right + ')');
    }
    callback();
  };

  ext.stopMotors = function(callback) {
    if (status.connected){
      socket.send('.stop_all_motors()');
    }
    callback();
  };

  // Block and block menu descriptions
  var descriptor = {
      blocks: [
          // Block type, block name, function name, param1 default value, param2 default value
          ['w', 'Say %s', 'speak', 'hello'],
          ['w', 'Drive %n mm at %n mm/s', 'drive', '10'],
          ['w', 'Turn motors, L: %n R: %n mm/s', 'drivePower', '10'],
          ['w', 'Stop motors', 'stopMotors'],
          ['w', 'Turn %n', 'turn', '90']
      ]
  };

  // Register the extension
  ScratchExtensions.register('Cozmo', descriptor, ext);

  var startSocket = function(){
    socket = new WebSocket('ws://127.0.0.1:8765/ws'); // connect to python sdk web server

    socket.onopen = function(event){
      console.log('Connected to Cozmo Python SDK');
      status.connected = true;
    };

    socket.onclose = function(event){
      status.connected = false;
      status.socket = null;
      if(!status.shutdown)
        setTimeout(startSocket, 2000); // try to reconnect to SDK
    };

    socket.onmessage = function(event) {
      if(event.data === 'robot'){
        status.robot = true;
      }else if(event.data === 'no robot'){
        status.robot = false;
      }
      if(event.data === 'done'){
        finishedTask = true;
      }
      //console.log(event.data);
    };
  };

  startSocket();

})({});
