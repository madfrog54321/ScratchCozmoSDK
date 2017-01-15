(function(ext) {

  //=============================================================
  //                          Variables
  var connection = {
    supported: false,
    socket: null,
    id: -1,
    msgCount: 0,
    pendingCommands: {},
    connected: {
      robot: false,
      controller: false
    }
  };
  var status = {
    tapped: [false, false, false],
    canSee: {
      cube: [false, false, false],
      face: false,
      pet: false,
      charger: false
    },
    state: {
      inHand: { current:false, last: false },
      onTracks: { current:false, last: false },
      onSide: { current:false, last: false }
    },
    direction:{
      cube: [0, 0, 0],
      face: 0,
      pet: 0,
      charger: 0
    },
    cliff: { current:false, last: false },
    voltage: 0,
    speed: 50,
    shutdown: false
  };

  //=============================================================
  //                           Blocks

  ext.speak = function(data, callback) {
    ext.sendCommand(callback, "say", data);
  };

  ext.setLight = function(light, color){
    console.log(light + "," + color);
    var hexColor = ext.getColor(color);
    var object = "";
    if(light == "All Cubes"){
      object = "allcubes";
    }else if (light == "Backpack"){
      object = "backpack";
    }else{
      console.log("bob")
      object = "cube" + ext.getCube(light);
      console.log("bob2")
    }
    ext.sendCommand(null, "light", object, hexColor);
  };

  ext.getColor = function(color){
    if(color === "White")
      return "#ffffff";
    else if (color === "Red")
      return "#ff0000";
    else if (color === "Orange")
      return "#ffa500";
    else if (color === "Yellow")
      return "#ffff00";
    else if (color === "Green")
      return "#00ff00";
    else if (color === "Blue")
      return "#0000ff";
    else if (color === "Purple")
      return "#ff00ff";
    else
      return "off";
  };

  ext.getHex = function(red, green, blue){
    var componentToHex = function(c) {
      if(c < 0)
        return "00";
      else if(c > 255)
        return "ff";
      else{
        var hex = parseInt(c).toString(16);
        return hex.length == 1 ? "0" + hex : hex;
      }
    }
    return "#" + componentToHex(red) + componentToHex(green) + componentToHex(blue);
  };

  ext.getCube = function(cube){
    if(cube === "Cube #1"){
      return 1;
    }else if(cube === "Cube #2"){
      return 2;
    }else if(cube === "Cube #3"){
      return 3;
    }
    return 0;
  };

  ext.canSee = function(object){
    if(object === "Any Cube")
      return seeStatus.cube1 || seeStatus.cube2 || seeStatus.cube3;
    if(object === "Cube #1")
      return seeStatus.cube1;
    if(object === "Cube #2")
      return seeStatus.cube2;
    if(object === "Cube #3")
      return seeStatus.cube3;
    if(object === "Charger")
      return seeStatus.charger;
    if(object === "Face")
      return seeStatus.face;
    if(object === "Pet")
      return seeStatus.pet;
    return false;
  };

  ext.setSpeed = function(speed){
    states.speed = speed;
  };

  ext.driveForward = function(direction, distance, callback){
    ext.sendCommand(callback, "drive", (direction === "Backward" ? -distance : distance) * 10.0, states.speed * 10.0);
  };

  ext.turn = function(degrees, direction, callback){
    ext.sendCommand(callback, "turn", direction === "Left" ? degrees : -degrees);
  };

  ext.stopMotors = function(){
    states.left_speed = 0;
    states.right_speed = 0;
    ext.sendCommand(null, "stop");
  };

  ext.tilt = function(degrees, callback){
    ext.sendCommand(callback, "tilt", degrees);
  };

  ext.lift = function(distance, callback){
    var dis = 0;
    if(distance == "Top"){
      dis = 1;
    }else if(distance == "Middle"){
      dis = 0.5;
    }
    ext.sendCommand(callback, "lift", dis);
  };

  ext.setVolume = function(volume){
    var vol = 0.75;
    if(volume === "High")
      vol = 1;
    else if(volume === "Low")
      vol = 0.25;
    else if(volume === "Mute")
      vol = 0;
    ext.sendCommand(null, "volume", vol);
  };

  ext.freeWill = function(state){
    var data = "disable";
    if(state === "Enable"){
      data = "enable";
    }
    ext.sendCommand(null, "freewill", data);
  };

  ext.pickup = function(cube, callback){
    ext.sendCommand(callback, "pickup", ext.getCube(cube));
  };

  ext.isTapped = function(cube){
    if((cube === "Any Cube" || ext.getCube(cube) === 1) && tapStatus.cube1){
      setTimeout(function(){
        tapStatus.cube1 = false;
      }, 10);
      return true;
    } else if((cube === "Any Cube" || ext.getCube(cube) === 2) && tapStatus.cube2){
      setTimeout(function(){
        tapStatus.cube2 = false;
      }, 10);
      return true;
    }else if((cube === "Any Cube" || ext.getCube(cube) === 3) && tapStatus.cube3){
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
    speed = (direction === "Forward" ? speed : -speed);
    if(motor === "Both"){
      states.left_speed = speed;
      states.right_speed = speed;
    }else if(motor === "Left"){
      states.left_speed = speed;
    }else if(motor === "Right"){
      states.right_speed = speed;
    }
    ext.sendCommand(null, "speed", states.left_speed * 10.0, states.right_speed * 10.0, 1000);
  };

  //=============================================================
  //                        Helper Methods

  //=============================================================
  //                     Connection Managment

  var sendCommand = function(callback, command){
    if(connection.connected.robot){
      var messageID = ++connection.msgCount;
      connection.pendingCommands[String(messageID)] = callback;
      //console.log(arguments);
      var data = Array.prototype.splice.call(arguments, 2);
      var message = command + "," + connection.id + "," + messageID + ",";
      message += data.join();
      //console.log("Sending Command: " + message);
      socket.send(message);
    } else if(callback != null){
      callback();
    }
  };

  var connectToController = function(){
    if (window.WebSocket){
      connection.supported = true;
    }
    if(!status.shutdown && connection.supported){
      connection.socket = new WebSocket("ws://127.0.0.1:9090/ws");

      connection.socket.onopen = function(event){
        connection.connected.controller = true;
        connection.socket.send("client");
      };

      connection.socket.onclose = function(event){
        connection.connected.connected = false;
        connection.socket = null;
        if(!status.shutdown)
          setTimeout(connectToController, 2000);
      };

      connection.socket.onmessage = function(event) {
        //console.log("Received Message: " + event.data)
        var command = event.data.split(",");
        var name = command[0];
        if(name == "id"){
          connection.id = command[1];
        }if(name === "cozmo"){
          connection.connected.robot = (command[1] === "connected");
        } else if(name === "finished" && command[2] == client_id){
          callback = connection.pendingCommands[command[3]];
          delete connection.pendingCommands[command[3]];
          if(callback != null){
            callback();
          }
        } else if(name === "status"){
          status.voltage = parseFloat(command[1]);
          status.state.onTracks.current = (command[2] == "True");
          status.state.onSide.current = (command[3] == "True");
          status.state.inHand.current = (command[4] == "True");
          status.cliff.current = (command[5] == "True");
          status.canSee.face = (command[6] == "True");
          status.canSee.pet = (command[7] == "True");
          status.canSee.cube[0] = (command[8] == "True");
          status.canSee.cube[1] = (command[9] == "True");
          status.canSee.cube[2] = (command[10] == "True");
          status.canSee.charger = (command[11] == "True");
          status.direction.cube[0] = parseInt(command[12]);
          status.direction.cube[1] = parseInt(command[13]);
          status.direction.cube[2] = parseInt(command[14]);
        } else if(name === "tapped"){
          status.tapped[parseInt(command[1]) - 1] = true;
        }
      };
    }
  };

  connectToController();

  //=============================================================
  //                          Extension

  ext._shutdown = function() {
    if (connection.socket.readyState === WebSocket.OPEN) {
      status.shutdown = true;
      connection.socket.close();
   }
  };

  ext._getStatus = function() {
    if(!connection.supported){
      return {status: 0, msg: "Your browser is not supported"}
    }else if(!status.connected.controller)
      return {status: 0, msg: "Missing Cozmo Controller app"}
    else if(!status.connected.robot)
      return {status: 1, msg: "No Cozmo connected"}
    else
      return {status: 2, msg: "Ready"};
  };

  var descriptor = {
      blocks: [
          ["w", "Say %s", "block_speak", "hi im cozmo"],
          ["w", "Act %m.emotions", "block_playEmotion", "Amazed"],
          ["w", "Play %m.animations animation", "block_playAnimation", "Sneeze"],
          ["s"],
          [" ", "Set speed to %n cm/s", "block_setSpeed", 5],
          ["w", "Move %n cm %m.direction", "block_moveDistance", 10 , "Forward"],
          ["w", "Turn %m.sideDirection %n degrees", "block_turnAngle", "Left", 90],
          [" ", "Drive %m.movement", "block_drive", "Forward"],
          [" ", "Stop driving", "block_stopDriving", "Forward"],
          ["s"],
          ["w", "Tilt head to %n degrees", "block_tiltHead", 20],
          ["w", "Lift arm to %m.heights", "block_liftArm", "Top"],
          ["s"],
          [" ", "Set %m.lights to %m.colors", "block_colorLight", "Backpack", "White"],
          ["s"],
          ["h", "When %m.cubes is tapped", "block_isTapped", "Any Cube"],
          ["h", "When Cozmo is %m.places", "block_inPlace", "Picked Up"],
          ["h", "When a cliff is found", "block_foundCliff"],
          ["s"],
          ["w", "Pickup %m.cubes", "block_pickedUp", "Cube #1"],
          ["w", "Place held cube on %m.cubes", "block_stackCube", "Cube #2"],
          [" ", "Stop everything Cozmo is doing", "block_Estop"],
          [" ", "%m.states Cozmo's free will", "block_freeWill", "Enable"],
          ["s"],
          ["b", "Cozmo can see %m.objects?", "block_canSee", "Any Cube"],
          ["b", "%m.objects is %m.cubeDirection of Cozmo?", "block_directionTo", "Face", "Left"],
          ["b", "Cozmo's battery is low?", "block_voltage"],
          ["s"],
          [" ", "Set driving time to %m.time", "block_setTime", "Short"],
          [" ", "%m.motion waiting for actions to finish", "block_stopWaiting", "Stop"],
          [" ", "Set Cozmo's volume to %m.volume", "block_setVolume", "Medium"],
          ["s"],
          [" ", "Open video stream viewer", "block_openStream"],
          ["s"],
          [" ", "Load sprite from file %s", "loadSprite", "demo.sprite2"],
          [" ", "Show costume %s of sprite %s", "test", "walking", "scratch"],
          [" ", "Animate sprite %s at %n fps", "test", "scratch", "1"],
          [" ", "Stop animating sprite", "test"],
          [" ", "Set display threshold to %n", "test", "100"],
      ],
      menus: {
        colors: ["Off", "White", "Red", "Orange","Yellow", "Green", "Blue", "Purple"],
        objects: ["Any Cube", "Cube #1", "Cube #2", "Cube #3", "Face", "Pet", "Charger"], // add face and pet
        cubes: ["Any Cube", "Cube #1", "Cube #2", "Cube #3"],
        lights: ["Backpack", "All Cubes", "Cube #1", "Cube #2", "Cube #3"],
        volume: ["High", "Medium", "Low", "Nothing"],
        cube: ["Cube #1", "Cube #2", "Cube #3"],
        sideDirection: ["Left", "Right"],
        direction: ["Forward", "Backward"],
        states: ["Enable", "Disable"],
        heights: ["Top", "Middle", "Bottom"],
        motion: ["Start", "Stop"],
        movement: ["Forward", "Backward", "Left", "Right", "Sharp Left", "Sharp Right"],
        time: ["Short", "Long", "Forever"],
        places: ["Placed On Tracks", "Rolled On Side", "Picked Up"],
        cubeDirection: ["Left", "In Front", "Right"],
        emotions: ["Upset", "Pleased", "Happy", "Amazed", "Angry", "Bored", "Startled"],
        animations: ["Greeting", "Sneeze", "What?", "Win", "Lose", "Facepalm", "Beeping", "New Object", "Lost Somthing", "Reject", "Failed", "Excited Greeting", "Talkative Greeting"]
      }
  };

  // Register the extension
  ScratchExtensions.register("Cozmo", descriptor, ext);




})({});
