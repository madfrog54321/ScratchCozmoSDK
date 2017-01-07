(function(ext) {


  var EMPTY_CMD = 0x00;

  // - - Commands - -

  var PICKED_UP = 0x01;
  var SET_BACK_LIGHT = 0x02;
  var TILT_HEAD = 0x03;
  var SET_VOLUME = 0x04;
  var SWITCH_AUTONOMOUS = 0x05;
  var DRIVE_FORWARD = 0x06;
  var STOP_MOTORS = 0x07;
  var STOP_ALL = 0x08;
  var TURN = 0x09;
  var SET_CUBE_COLOR = 0x10;
  var START_ANIMATION = 0x11;
  var START_BEHAVIOR = 0x12;
  var START_SEARCH = 0x13;
  var MOVE_LIFT = 0x14;
  var RAISE_LIFT = 0x15;
  var LOWER_LIFT = 0x16;
  var SET_MOTOR_SPEED = 0x17;
  var SAY_TEXT = 0x18;

  var GET_VOLTAGE = 0x19;
  var GET_IS_MOVING = 0x20;
  var GET_IS_AUTONOMOUS = 0x21;
  var GET_IS_IDLE = 0x22;
  var GET_IS_CONNECTED = 0x23;

  // - - Event - -

  var PICKED_UP = 0x30;
  var CUBE_TAPPED = 0x31;
  var CUBE_OBSERVED = 0x32;
  var CUBE_LOST = 0x3a;
  var CLIFF_FOUND = 0x33;

  var RETURN_VOLTAGE = 0x34;
  var RETURN_IS_MOVING = 0x35;
  var RETURN_IS_AUTONOMOUS = 0x36;
  var RETURN_IS_IDLE = 0x37;
  var RETURN_IS_CONNECTED = 0x38;
  var RETURN_ACTION_DONE = 0x39;

  // - - Object / States - -

  var ANY_CUBE = 0x50;
  var CUBE_1 = 0x51;
  var CUBE_2 = 0x52;
  var CUBE_3 = 0x53;

  var COLOR_WHITE = 0x54;
  var COLOR_RED = 0x55;
  var COLOR_GREEN = 0x56;
  var COLOR_BLUE = 0x57;
  var COLOR_OFF = 0x58;

  var VOLUME_LOW = 0x59;
  var VOLUME_MEDIUM = 0x60;
  var VOLUME_HIGH = 0x61;

  var WAIT = 0x62;
  var NO_WAIT = 0x63;

  var CONNECTED = 0x64;
  var NOT_CONNECTED = 0X65;

  // - - - -

  var socket = null;
  var finishedTask = false;
  var finishedType = false;
  var isWaiting = false;

  var cubeTapped = false;
  var tappedCube = 0;

  var cubeSeen = false;
  var seenCube = 0;

  var cubeLost = false;
  var lostCube = 0;

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
    socket.send(GET_IS_CONNECTED);
    if(!status.connected)
      return {status: 0, msg: 'Cozmo controller not found'}
    else if(!status.robot)
      return {status: 1, msg: 'Cozmo not found'}
    else
      return {status: 2, msg: 'Cozmo connected'};
  };

  ext.speak = function(data, flow, callback) {
    if (status.connected){
      if(flow === 'Wait'){
        socket.send(SAY_TEXT + "," + data + ",-," + WAIT);
        ext.waitForCommandComplete(SAY_TEXT, callback);
      }else{
        socket.send(SAY_TEXT + "," + data + ",-," + NO_WAIT);
        callback();
      }
    }else {callback();}
  };

  ext.getColorCode = function(color){
    var code = COLOR_OFF;
    if(color === 'White')
      code = COLOR_WHITE;
    else if(color === 'Red')
      code = COLOR_RED;
    else if(color === 'Green')
      code = COLOR_GREEN;
    else if(color === 'Blue')
      code = COLOR_BLUE;
    return code;
  };

  ext.getCubeNum = function(cube){
    var code = 0;
    if(cube == 'Any Cube')
      code = -1;
    else if(cube === 'Cube 1')
      code = 1;
    else if(cube === 'Cube 2')
      code = 2;
    else if(cube === 'Cube 3')
      code = 3;
    return code;
  }

  ext.setBackpack = function(color){
    if (status.connected){
      socket.send(SET_BACK_LIGHT + "," + ext.getColorCode(color) + ",-," + NO_WAIT);
    }
  };

  ext.setCubeLight = function(cube, color){
    if(cube < 1 || cube > 3){
      alert("Cannot set color of non existent cube #" + cube + ". Cube # must be between 1 - 3");
    }else{
      if (status.connected){
        socket.send(SET_CUBE_COLOR + "," + (parseInt(cube) + CUBE_1 - 1) + "," + ext.getColorCode(color) + "," + NO_WAIT);
      }
    }
  };

  ext.whenSee = function(object){
    if(cubeSeen && (ext.getCubeNum(object) == seenCube || ext.getCubeNum(object) == -1)){
      setTimeout(function(){
        cubeSeen = false;
      }, 10);
      return true;
    }
    return false;
  };

  ext.lookFor = function(object){

  };

  ext.seenCube = function(){
    return seenCube;
  };

  ext.whenNotSee = function(object){
    if(cubeLost && (ext.getCubeNum(object) == lostCube || ext.getCubeNum(object) == -1)){
      setTimeout(function(){
        cubeLost = false;
      }, 10);
      return true;
    }
    return false;
  };

  ext.goneCube = function(){
    return lostCube;
  };

  ext.cubeTapped = function(cube){
    if(cubeTapped && (ext.getCubeNum(cube) == tappedCube || ext.getCubeNum(cube) == -1)){
      setTimeout(function(){
        cubeTapped = false;
      }, 10);
      return true;
    }
    return false;
  };

  ext.getTappedCube = function(){
    return tappedCube;
  };

  ext.waitForCommandComplete = function(name, callback){
      console.log('waiting');
      isWaiting = true;
      var loop = function() {
        if(finishedTask && finishedType === name){
          isWaiting = false;
          finishedTask = false;
          finishedType = false;
          console.log('done');
          callback();
        }
        else
          setTimeout(loop, 10);
      };
      setTimeout(loop, 10);
  };

  // Block and block menu descriptions
  var descriptor = {
      blocks: [
          // Block type, block name, function name, param1 default value, param2 default value
          ['w', 'Say %s and %m.flow', 'speak', 'hello', 'Wait'],
          [' ', 'Set back lights to %m.colors', 'setBackpack', 'White'],
          [' ', 'Set cube # %n color to %m.colors', 'setCubeLight', '1', 'White'],
          [' ', 'Start look for %m.objects', 'lookFor', 'Any Cube'],
          ['h', 'When Cozmo sees %m.objects', 'whenSee', 'Any Cube'],
          ['r', 'Seen cube', 'seenCube'],
          ['h', 'When %m.objects disappears', 'whenNotSee', 'Any Cube'],
          ['r', 'Disappeared cube', 'goneCube'],
          ['h', 'When %m.cubes is tapped', 'cubeTapped', 'Any Cube'],
          ['r', 'Tapped cube', 'getTappedCube']
      ],
      menus: {
        colors: ['Off', 'White', 'Red', 'Green', 'Blue'],
        objects: ['Any Cube', 'Cube 1', 'Cube 2', 'Cube 3'], // add face and pet
        cubes: ['Any Cube', 'Cube 1', 'Cube 2', 'Cube 3'],
        flow: ['Wait', 'Continue']
      }
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
      var command = event.data.split(",");
      var name = parseInt(command[0]);
      var data = parseInt(command[1]);
      if(name === RETURN_IS_CONNECTED && data === CONNECTED){
        status.robot = true;
      } else if(name === RETURN_IS_CONNECTED && data === NOT_CONNECTED){
        status.robot = false;
      } else if(name === RETURN_ACTION_DONE && isWaiting){
        finishedType = data;
        finishedTask = true;
      } else if(name == CUBE_TAPPED){
        if(data == CUBE_1)
          tappedCube = 1;
        else if(data == CUBE_2)
          tappedCube = 2;
        else if (data == CUBE_3)
          tappedCube = 3;
        else
          tappedCube = -1;
        cubeTapped = true;
      }else if(name === CUBE_OBSERVED){
        console.log("cube!");
        if(data == CUBE_1)
          seenCube = 1;
        else if(data == CUBE_2)
          seenCube = 2;
        else if (data == CUBE_3)
          seenCube = 3;
        else
          seenCube = -1;
        cubeSeen = true;
      }else if(name === CUBE_LOST){
        console.log("cube!");
        if(data == CUBE_1)
          lostCube = 1;
        else if(data == CUBE_2)
          seenCube = 2;
        else if (data == CUBE_3)
          lostCube = 3;
        else
          lostCube = -1;
        cubeLost = true;
      }else{
        console.log("got message: " + event.data);
      }
      //console.log(event.data);
    };
  };

  startSocket();

})({});
