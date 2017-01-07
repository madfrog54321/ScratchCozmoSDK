(function(ext) {

  var socket = null;

  var doneEvent = {
    done:false,
    waiting:false
  };

  var tapEvent = {
    tapped:false,
    cube:0
  };

  var seeStatus = {
    cube1:false,
    cube2:false,
    cube3:false,
    face:false,
    pet:false,
    charger:false
  };

  var tapStatus = {
    cube1: false,
    cube2: false,
    cube3: false
  };

  var pickedUp = {
    current:false,
    last:false
  };
  var cliffFound = {
    current:false,
    last:false
  };
  var voltage = 0;

  var states = {
    speed:50
  };

  var status = {
    connected: false,
    robot: false,
    shutdown: false
  };

  // Cleanup function when the extension is unloaded
  ext._shutdown = function() {
    if (socket.readyState === WebSocket.OPEN) {
      status.shutdown = true;
      socket.close();
   }
  };

  ext.sendCommand = function(command){
    console.log('Sending Command: ' + command);
    socket.send(command);
  };

  // Status reporting code
  // Use this to report missing hardware, plugin or unsupported browser
  ext._getStatus = function() {
    if(!status.connected)
      return {status: 0, msg: 'Missing Cozmo Controller app'}
    else if(!status.robot)
      return {status: 1, msg: 'No Cozmo connected'}
    else
      return {status: 2, msg: 'Ready'};
  };

  ext.speak = function(data, flow, callback) {
    if (status.connected){
      ext.sendCommand("speak," + data + ",-,-," + (flow === 'Wait' ? 'wait' : 'async'));
      if(flow === 'Wait')
        ext.waitForDone(callback);
      else
        callback();
    }else
      callback();
  };

  ext.setCubeLight = function(cube, color){
    if (status.connected){
      ext.sendCommand("cubeLight," + cube + "," + color + ",-,async");
    }
  };

  ext.getColor = function(color){
    if(color === 'White')
      return '#ffffff';
    else if (color === 'Red')
      return '#ff0000';
    else if (color === 'Orange')
      return '#ffa500';
    else if (color === 'Yellow')
      return '#ffff00';
    else if (color === 'Green')
      return '#00ff00';
    else if (color === 'Blue')
      return '#0000ff';
    else if (color === 'Purple')
      return '#ff00ff';
    else
      return 'off';
  };

  ext.getVolume = function(volume){
    var vol = 0.75;
    if(volume === 'High')
      vol = 1;
    else if(volume === 'Low')
      vol = 0.25;
    else if(volume === 'Mute')
      vol = 0;
    return vol;
  };

  ext.setBack = function(color) {
    if (status.connected){
      ext.sendCommand('backlight,' + color + ',-,-,async');
    }
  };

  ext.getHex = function(red, green, blue){
    var componentToHex = function(c) {
      if(c < 0)
        return '00';
      else if(c > 255)
        return 'ff';
      else{
        var hex = parseInt(c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }
    }
    return "#" + componentToHex(red) + componentToHex(green) + componentToHex(blue);
  };

  ext.setLight = function(light, color){
    if(light === 'Backpack'){
      ext.setBack(ext.getColor(color));
    }else if(light === 'All Cubes'){
      ext.setCubeLight(1, ext.getColor(color));
      ext.setCubeLight(2, ext.getColor(color));
      ext.setCubeLight(3, ext.getColor(color));
    }else{
      ext.setCubeLight(ext.getCube(light), ext.getColor(color));
    }
  };

  ext.getCube = function(cube){
    if(cube === 'Cube #1'){
      return 1;
    }else if(cube === 'Cube #2'){
      return 2;
    }else if(cube === 'Cube #3'){
      return 3;
    }else{
      return 0;
    }
  };

  ext.canSee = function(object){
    if(object === 'Any Cube')
      return seeStatus.cube1 || seeStatus.cube2 || seeStatus.cube3;
    if(object === 'Cube #1')
      return seeStatus.cube1;
    if(object === 'Cube #2')
      return seeStatus.cube2;
    if(object === 'Cube #3')
      return seeStatus.cube3;
    if(object === 'Charger')
      return seeStatus.charger;
    if(object === 'Face')
      return seeStatus.face;
    if(object === 'Pet')
      return seeStatus.pet;
    return false;
  };

  ext.setSpeed = function(speed){
    states.speed = speed;
  };

  ext.driveForward = function(direction, distance, callback){
    if (status.connected){
      ext.sendCommand("drive," + (direction === 'Backward' ? -distance : distance) + "," + states.speed + ",-,wait");
      ext.waitForDone(callback);
    }else
      callback();
  };

  ext.turn = function(degrees, direction, callback){
    if (status.connected){
      ext.sendCommand("turn," + (direction === 'Left' ? degrees : -degrees) + ",-,-,wait");
      ext.waitForDone(callback);
    }else
      callback();
  };

  ext.stopMotors = function(){
    ext.sendCommand('stop,-,-,-,continue');
  };

  ext.tilt = function(degrees, callback){
    if (status.connected){
      ext.sendCommand("tilt," + degrees + ",-,-,wait");
      ext.waitForDone(callback);
    }else
      callback();
  };

  ext.lift = function(distance, callback){
    var dis = 0;
    if(distance == 'Top'){
      dis = 1;
    }else if(distance == 'Middle'){
      dis = 0.5;
    }
    if (status.connected){
      ext.sendCommand("lift," + dis + ",-,-,wait");
      ext.waitForDone(callback);
    }else
      callback();
  };

  ext.setVolume = function(volume){
    ext.sendCommand("volume," + ext.getVolume(volume) + ",-,-,continue");
  };

  ext.freeWill = function(state){
    var data = 'disable';
    if(state === 'Enable'){
      data = 'enable';
    }
    ext.sendCommand("freewill," + data + ",-,-,continue");
  };

  ext.pickup = function(cube, callback){
    if (status.connected){
      ext.sendCommand("pickup," + ext.getCube(cube) + ",-,-,wait");
      ext.waitForDone(callback);
    }else
      callback();
  };

  ext.isTapped = function(cube){
    if((cube === 'Any Cube' || ext.getCube(cube) === 1) && tapStatus.cube1){
      setTimeout(function(){
        tapStatus.cube1 = false;
      }, 10);
      return true;
    } else if((cube === 'Any Cube' || ext.getCube(cube) === 2) && tapStatus.cube2){
      setTimeout(function(){
        tapStatus.cube2 = false;
      }, 10);
      return true;
    }else if((cube === 'Any Cube' || ext.getCube(cube) === 3) && tapStatus.cube3){
      setTimeout(function(){
        tapStatus.cube3 = false;
      }, 10);
      return true;
    }
    return false;
  };

  ext.isPickedUp = function(){
    if(pickedUp.current && !pickedUp.last){
      setTimeout(function(){
        pickedUp.current = false;
        pickedUp.last = true;
      }, 10);
      return true;
    } else if (!pickedUp.current && pickedUp.last){
      pickedUp.last = false;
    }
    return false;
  };

  ext.cliff = function(){
    if(cliffFound.current && !cliffFound.last){
      setTimeout(function(){
        cliffFound.current = false;
        cliffFound.last = true;
      }, 10);
      return true;
    } else if (!cliffFound.current && cliffFound.last){
      cliffFound.last = false;
    }
    return false;
  };

  ext.voltage = function(){
    return voltage < 3.5;
  };

  // Block and block menu descriptions
  var descriptor = {
      blocks: [
          // Block type, block name, function name, param1 default value, param2 default value
          ['w', 'Say %s and %m.flow', 'speak', 'hello', 'Wait'],
          ['s'], ['s'],
          [' ', 'Set drive speed to %n mm/s', 'setSpeed', '50'],
          ['w', 'Drive %m.direction %n mm', 'driveForward' , 'Forward', '100'],
          ['w', 'Turn %n degrees %m.sideDirection', 'turn', '90', 'Left'],
          [' ', 'Set %m.motors motor speed to %n mm/s'],
          [' ', "Stop Cozmo's motors", 'stopMotors'],
          ['s'], ['s'],
          ['w', 'Tilt head to %n degrees', 'tilt', '20'],
          ['w', 'Move lift to %m.heights', 'lift', 'Top'],
          ['s'], ['s'],
          //[' ', 'Set back lights to %s', 'setBack', '#f7b83b'],
          //[' ', 'Set cube # %n to %s', 'setCubeLight', '1', '#f7b83b'],
          [' ', 'Set %m.lights to %m.colors', 'setLight', 'Backpack', 'White'],
          //['r', '%m.colors', 'getColor', 'White'],
          //['r', 'Red %n Green %n Blue %n', 'getHex', 255, 255, 255],
          ['s'], ['s'],
          //[' ', 'Set animation/face', 'face'],
          //[' ', 'Do behavior', 'behavior'],
          [' ', "Set Cozmo's volume to %m.volume", 'setVolume', 'Medium'],
          [' ', "%m.states Cozmo's free will", 'freeWill', 'Enable'],
          ['w', 'Pickup %m.cube', 'pickup', 'Cube #1'],
          ['s'], ['s'],
          ['h', 'When %m.cubes is tapped', 'isTapped', 'Any Cube'],
          ['h', 'When Cozmo is picked up', 'isPickedUp'],
          ['h', 'When cliff found', 'cliff'],
          ['s'], ['s'],
          ['b', 'Cozmo can see %m.objects', 'canSee', 'Any Cube'],
          ['b', "Cozmo's battery is low", 'voltage'],
      ],
      menus: {
        colors: ['Off', 'White', 'Red', 'Orange','Yellow', 'Green', 'Blue', 'Purple'],
        objects: ['Any Cube', 'Cube #1', 'Cube #2', 'Cube #3', 'Face', 'Pet', 'Charger'], // add face and pet
        cubes: ['Any Cube', 'Cube #1', 'Cube #2', 'Cube #3'],
        lights: ['Backpack', 'All Cubes', 'Cube #1', 'Cube #2', 'Cube #3'],
        volume: ['High', 'Medium', 'Low', 'Mute'],
        cube: ['Cube #1', 'Cube #2', 'Cube #3'],
        sideDirection: ['Left', 'Right'],
        direction: ['Forward', 'Backward'],
        states: ['Enable', 'Disable'],
        flow: ['Wait', 'Continue'],
        motors: ['Left', 'Right'],
        heights: ['Top', 'Middle', 'Bottom']
      }
  };

  ext.waitForDone = function(callback){
      doneEvent.waiting = true;
      var loop = function() {
        if(status.connected){
          if(doneEvent.done){
            doneEvent.waiting = false;
            doneEvent.done = false;
            callback();
          }
          else
            setTimeout(loop, 50);
        } else
          callback();
      };
      loop();
  };

  // Register the extension
  ScratchExtensions.register('Cozmo', descriptor, ext);

  var startSocket = function(){
    if(!status.shutdown){
      socket = new WebSocket('ws://127.0.0.1:9090/ws'); // connect to python sdk web server

      socket.onopen = function(event){
        status.connected = true;
        socket.send('client');
      };

      socket.onclose = function(event){
        status.connected = false;
        status.socket = null;
        if(!status.shutdown)
          setTimeout(startSocket, 2000); // try to reconnect to SDK
      };

      socket.onmessage = function(event) {
        console.log('Event: ' + event.data)
        var command = event.data.split(",");
        var name = command[0];
        var kind = command[1];
        var data = command[2];
        if(name === 'status'){
          if(kind === 'robot'){
            if(data === 'connected'){
              status.robot = true;
            }else if(data === 'waiting'){
              status.robot = false;
            }
          }
        } else if(name === 'done'){
          if(doneEvent.waiting){
            doneEvent.done = true;
          }
        } else if(name === 'see'){
          if(kind === 'face'){
            seeStatus.face = (data === 'yes');
          } else if(kind === 'pet'){
            seeStatus.pet = (data === 'yes');
          } else if(kind === 'charger'){
            seeStatus.charger = (data === 'yes');
          } else if(kind === 'cube1'){
            seeStatus.cube1 = (data === 'yes');
          } else if(kind === 'cube2'){
            seeStatus.cube2 = (data === 'yes');
          } else if(kind === 'cube3'){
            seeStatus.cube3 = (data === 'yes');
          }
        } else if(name === 'tapped'){
          if(kind === 'cube1'){
            tapStatus.cube1 = (data === 'yes');
          } else if(kind === 'cube2'){
            tapStatus.cube2 = (data === 'yes');
          } else if(kind === 'cube3'){
            tapStatus.cube3 = (data === 'yes');
          }
        } else if(name === 'pickedUp'){
          pickedUp.current = (data === 'yes');
        } else if(name === 'cliff'){
          cliffFound.current = (data === 'yes');
        } else if(name === 'voltage'){
          voltage = parseFloat(data);
        }
      };
    }
  };

  startSocket();

})({});
