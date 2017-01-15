(function(ext) {

  var socket = null;
  var client_id = -1;
  var messageCount = 0;
  var pendingCommands = {};

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
    speed:5,
    left_speed:5,
    right_speed:5
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

  ext.sendCommand = function(callback, command){
    if(status.connected){
      var messageID = ++messageCount;
      pendingCommands[String(messageID)] = callback;
      console.log(arguments);
      var data = Array.prototype.splice.call(arguments, 2);
      var message = command + ',' + client_id + ',' + messageID + ',';
      message += data.join();
      console.log('Sending Command: ' + message);
      socket.send(message);
    } else if(callback != null){
      callback();
    }
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

  ext.speak = function(data, callback) {
    ext.sendCommand(callback, 'say', data);
  };

  ext.setLight = function(light, color){
    console.log(light + "," + color);
    var hexColor = ext.getColor(color);
    var object = '';
    if(light == 'All Cubes'){
      object = 'allcubes';
    }else if (light == 'Backpack'){
      object = 'backpack';
    }else{
      console.log('bob')
      object = 'cube' + ext.getCube(light);
      console.log('bob2')
    }
    ext.sendCommand(null, "light", object, hexColor);
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

  ext.getCube = function(cube){
    if(cube === 'Cube #1'){
      return 1;
    }else if(cube === 'Cube #2'){
      return 2;
    }else if(cube === 'Cube #3'){
      return 3;
    }
    return 0;
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
    ext.sendCommand(callback, "drive", (direction === 'Backward' ? -distance : distance) * 10.0, states.speed * 10.0);
  };

  ext.turn = function(degrees, direction, callback){
    ext.sendCommand(callback, "turn", direction === 'Left' ? degrees : -degrees);
  };

  ext.stopMotors = function(){
    states.left_speed = 0;
    states.right_speed = 0;
    ext.sendCommand(null, 'stop');
  };

  ext.tilt = function(degrees, callback){
    ext.sendCommand(callback, "tilt", degrees);
  };

  ext.lift = function(distance, callback){
    var dis = 0;
    if(distance == 'Top'){
      dis = 1;
    }else if(distance == 'Middle'){
      dis = 0.5;
    }
    ext.sendCommand(callback, "lift", dis);
  };

  ext.setVolume = function(volume){
    var vol = 0.75;
    if(volume === 'High')
      vol = 1;
    else if(volume === 'Low')
      vol = 0.25;
    else if(volume === 'Mute')
      vol = 0;
    ext.sendCommand(null, "volume", vol);
  };

  ext.freeWill = function(state){
    var data = 'disable';
    if(state === 'Enable'){
      data = 'enable';
    }
    ext.sendCommand(null, "freewill", data);
  };

  ext.pickup = function(cube, callback){
    ext.sendCommand(callback, "pickup", ext.getCube(cube));
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

  ext.move = function(motor, direction, speed){
    speed = (direction === 'Forward' ? speed : -speed);
    if(motor === 'Both'){
      states.left_speed = speed;
      states.right_speed = speed;
    }else if(motor === 'Left'){
      states.left_speed = speed;
    }else if(motor === 'Right'){
      states.right_speed = speed;
    }
    ext.sendCommand(null, "speed", states.left_speed * 10.0, states.right_speed * 10.0, 1000);
  };

  // Block and block menu descriptions
  var descriptor = {
      blocks: [
          // Block type, block name, function name, param1 default value, param2 default value
          [' ', 'Load sprite from $s', 'loadSprite', 'demo.sprite2']
          ['s'], ['s'],
          ['w', 'Say %s', 'speak', 'hi im cozmo'],
          [' ', 'Look %m.emotions', 'behavior', 'Amazed'],
          [' ', 'Play %m.animations animation', 'behavior', 'Sneeze'],
          ['s'], ['s'],
          [' ', 'Set speed to %n cm/s', 'setSpeed', 5],
          ['w', 'Move %n cm %m.direction', 'driveForward', 10 , 'Forward'],
          ['w', 'Turn %m.sideDirection %n degrees', 'turn', 'Left', 90],
          //[' ', 'Move %m.motors track %m.direction at %n cm/s', 'move', 'Both', 'Forward', 5
          [' ', 'Drive %m.movement', 'move', 'Forward'],
          [' ', 'Stop driving', 'stopMove', 'Forward'],
          ['s'], ['s'],
          ['w', 'Tilt head to %n degrees', 'tilt', 20],
          ['w', 'Move lift to %m.heights', 'lift', 'Top'],
          ['s'], ['s'],
          //[' ', 'Set back lights to %s', 'setBack', '#f7b83b'],
          //[' ', 'Set cube # %n to %s', 'setCubeLight', '1', '#f7b83b'],
          [' ', 'Set %m.lights to %m.colors', 'setLight', 'Backpack', 'White'],
          //['r', '%m.colors', 'getColor', 'White'],
          //['r', 'Red %n Green %n Blue %n', 'getHex', 255, 255, 255],
          ['s'], ['s'],
          ['h', 'When %m.cubes is tapped', 'isTapped', 'Any Cube'],
          ['h', 'When Cozmo is %m.places', 'isPickedUp', 'Picked Up'],
          ['h', 'When cliff found', 'cliff'],
          ['s'], ['s'],
          //[' ', 'Set animation/face', 'face'],
          ['w', 'Pickup %m.cube', 'pickup', 'Cube #1'],
          ['w', 'Place held cube on %m.cube', 'pickup', 'Cube #2'],
          [' ', "Stop everything Cozmo is doing", 'stopMotors'],
          [' ', "%m.states Cozmo's free will", 'freeWill', 'Enable'],
          ['s'], ['s'],
          ['b', 'Cozmo can see %m.objects?', 'canSee', 'Any Cube'],
          ['b', "%m.cube is %m.cubeDirection of Cozmo?", 'canSee', 'Cube #1', 'Left'],
          ['b', "Cozmo's battery is low?", 'voltage'],
          ['s'], ['s'],
          [' ', 'Set driving time to %m.time', 'bob', 'Short'],
          [' ', '%m.motion waiting for actions to finish', 'bob', 'Stop'],
          [' ', "Set Cozmo's volume to %m.volume", 'setVolume', 'Medium']
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
        motors: ['Both', 'Left', 'Right'],
        heights: ['Top', 'Middle', 'Bottom'],
        motion: ['Start', 'Stop'],
        movement: ['Forward', 'Backward', 'Left', 'Right', 'Sharp Left', 'Sharp Right'],
        time: ['Short', 'Long', 'Forever'],
        places: ['Placed On Tracks', 'Rolled On Side', 'Picked Up'],
        cubeDirection: ['Left', 'In Front', 'Right'],
        emotions: ['Upset', 'Pleased', 'Happy', 'Amazed', 'Angry', 'Bored', 'Startled'],
        animations: ['Greeting', 'Sneeze', 'What?', 'Win', 'Lose', 'Facepalm', 'Beeping', 'New Object', 'Lost Somthing', 'Reject', 'Failed', 'Excited Greeting', 'Talkative Greeting']
      }
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
        if(name == 'id'){
          client_id = command[1];
        }if(name === 'cozmo'){
          if(command[1] === 'connected'){ status.robot = true; }
          else if(command[1] === 'waiting'){ status.robot = false; }
        } else if(name === 'finished' && command[2] == client_id){
          callback = pendingCommands[command[3]];
          delete pendingCommands[command[3]];
          callback();
        } else if(name === 'status'){
          voltage = parseFloat(command[1]);
          pickedUp.current = (command[2] == 'True');
          //onTracks
          cliffFound.current = (command[4] == 'True');
          seeStatus.face = (command[5] == 'True');
          seeStatus.pet = (command[6] == 'True');
          seeStatus.charger = (command[10] == 'True');
          seeStatus.cube1 = (command[7] == 'True');
          seeStatus.cube2 = (command[8] == 'True');
          seeStatus.cube3 = (command[9] == 'True');
        } else if(name === 'tapped'){
          if(command[1] === '1'){
            tapStatus.cube1 = true;
          } else if(command[1] === '2'){
            tapStatus.cube2 = true;
          } else if(command[1] === '3'){
            tapStatus.cube3 = true;
          }
        }
      };
    }
  };

  startSocket();

})({});
