(function(ext) {

  //=============================================================
  //                          Variables

  var MM_to_CM = 10;
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
    wasTappedTimeout: null,
    wastapped: [false, false, false],
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
    waitForFinish: true,
    driveTime: 0,
    shutdown: false
  };

  //=============================================================
  //                           Blocks

  var block_speak = function(text, callback) {
    sendCommand(callback, "speak", text);
  };

  var block_playEmotion = function(emotion, callback){
    sendCommand(callback, "playEmotion", emotion);
  };

  var block_playAnimation = function(animation, callback){
    sendCommand(callback, "playAnimation", animation);
  };

  var block_setSpeed = function(speed){
    status.speed = float(speed) * MM_to_CM;
  };

  var block_moveDistance = function(distance, direction, callback){
    sendCommand(callback, "moveDistance", distance * (direction === "Forward" ? 1 : -1) * MM_to_CM, status.speed);
  };

  var block_turnAngle = function(direction, angle, callback){
    sendCommand(callback, "turnAngle", angle * (direction === "Left" ? -1 : 1));
  };

  var block_drive = function(direction){
    var left = 1
    var right = 1
    if(direction == "Backward"){
      left = -1;
      right = -1;
    } else if(direction == "Left"){
      left = 0.5;
      right = 1;
    } else if(direction == "Right"){
      left = 1;
      right = 0.5;
    } else if(direction == "Sharp Left"){
      left = -1;
      right = 1;
    } else if(direction == "Sharp Right"){
      left = 1;
      right = -1;
    }
    sendCommand(null, "drive", left * status.speed, right * status.speed, 1000.0)
    stopDrivingAfterTime();
  };

  var block_stopDriving = function(){
    sendCommand(null, "stopDriving");
  };

  var block_tiltHead = function(angle, callback){
    sendCommand(callback, "tiltHead", angle);
  };

  var block_liftArm = function(height, callback){
    var rawHeight = 0;
    if(height === "Middle"){
      rawHeight = 0.5;
    }else if(height === "Top"){
      rawHeight = 1;
    }
    sendCommand(callback, "liftArm", rawHeight, 100, 0.5);
  };

  var block_colorLight = function(light, color){
    sendCommand(null, "colorLight", light, getHexFromColor(color));
  };

  var block_whenTapped = function(cube){
    var num = getCubeNumber(cube);
    var tapped = false;
    for(var i = 0; i < status.tapped.length; i++){
      if(status.tapped[i] && (num === i + 1 || num === 0)){
        resetTapped(i);
      }
    }
    return tapped;
  };

  var block_whenPlace = function(place){
    if(place === "Picked Up"){
      if(status.state.inHand.current === true && status.state.inHand.last === false){
        resetState(status.state.inHand);
        return true;
      } else if(status.state.inHand.current === true && status.state.inHand.last === false){
        status.state.inHand.last = false;
      }
    }else if(place === "Placed On Tracks"){
      if(status.state.onTracks.current === true && status.state.onTracks.last === false){
        resetState(status.state.onTracks);
        return true;
      } else if(status.state.onTracks.current === true && status.state.onTracks.last === false){
        status.state.onTracks.last = false;
      }
    }else if(place === "Rolled On Side"){
      if(status.state.onSide.current === true && status.state.onSide.last === false){
        resetState(status.state.onSide);
        return true;
      } else if(status.state.onSide.current === true && status.state.onSide.last === false){
        status.state.onSide.last = false;
      }
    }
    return false;
  };

  var block_whenCliff = function(){
    if(status.cliff.current === true && status.cliff.last === false){
      resetState(status.cliff);
      return true;
    } else if(status.cliff.current === true && status.cliff.last === false){
      status.cliff.last = false;
    }
    return false;
  };

  var block_pickedUp = function(cube, callback){
    sendCommand(callback, "pickedUp", getCubeNumber(cube));
  };

  var block_stackCube = function(cube, callback){
    sendCommand(callback, "stackCube", getCubeNumber(cube));
  };

  var block_Estop = function(){
    sendCommand(null, "Estop");
  };

  var block_freewill = function(state){
    sendCommand(null, "freewill", state);
  };

  var block_canSee = function(object){
    if(object === "face"){
      return status.canSee.face;
    }else if(object === "pet"){
      return status.canSee.pet;
    }else if(object === "charger"){
      return status.canSee.charger;
    }else if(object[:6] === "cube #"){
      return status.canSee.cube[int(object[7]) - 1];
    }
    return false;
  };

  var block_wasTapped = function(cube){
    return status.wasTapped[getCubeNumber(cube)];
  };

  var block_isDirection = function(object, direction){
    if(object === "Any Cube"){
      return isDirection(status.direction.cube[0], direction) ||
             isDirection(status.direction.cube[1], direction) ||
             isDirection(status.direction.cube[2], direction);
    }else if(object[:6] === "Cube #1"){
      return isDirection(status.direction.cube[int(object[7]) - 1], direction);
    }else if(object === "Face"){
      return isDirection(status.direction.face, direction);
    }else if(object === "Pet"){
      return isDirection(status.direction.pet, direction);
    }else if(object === "Charger"){
      return isDirection(status.direction.charger, direction);
    }
  };

  var block_voltage = function(){
    return status.voltage < 3.5;
  };

  var block_setTime = function(time){
    if(time === "Short")
      status.driveTime = 1;
    else if(time === "Long")
      status.driveTime = 2;
    else if(time === "Forever")
      status.driveTime = 0;
  };

  var block_stopWaiting = function(state){
    status.waitForFinish = (state === "Start");
  };

  //=============================================================
  //                        Helper Methods

  var isDirection = function(direction, test){
    var testDirection = 0;
    if(test === "Left"){
      testDirection = 1;
    }else if(test === "In Front"){
      testDirection = 2;
    }else if(test === "Right"){
      testDirection = 3;
    }
    return (testDirection === direction);
  };

  var resetState = function(state){
    setTimeout(function(){
      state.current = false
    }, 10);
  };

  var drivingTimeout = null;
  var stopDrivingAfterTime = function(){
    if(status.driveTime != 0){
      if(drivingTimeout != null){
        clearTimeout(drivingTimeout);
      }
      drivingTimeout = setTimeout(function() {
        ext.stopDriving();
      }, (status.driveTime === 1 ? 100 : 1000));
    }
  };

  var getCubeNumber = function(cube){
    var num = 0;
    if(cube === "Cube #1"){
      num = 1;
    }else if(cube === "Cube #2"){
      num = 2;
    }else if(cube === "Cube #3"){
      num = 3;
    }
    return num;
  };

  var resetTapped = function(num){
    setTimeout(function(){
      status.tapped[num] = false
    }, 10);
  };

  var getHexFromColor(color){
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
      connection.socket = new WebSocket("ws://localhost:9090/ws");

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
          status.wastapped[parseInt(command[1]) - 1] = true;
          if(status.wasTappedTimeout != null){
            clearTimeout(status.wasTappedTimeout);
          }
          status.wasTappedTimeout = setTimeout(function() {
            status.wastapped[parseInt(command[1]) - 1] = false;
          }, 1000);
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
          [" ", "Stop driving", "block_stopDriving"],
          ["s"],
          ["w", "Tilt head to %n degrees", "block_tiltHead", 20],
          ["w", "Lift arm to %m.heights", "block_liftArm", "Top"],
          ["s"],
          [" ", "Set %m.lights to %m.colors", "block_colorLight", "Backpack", "White"],
          ["s"],
          ["h", "When %m.cubes is tapped", "block_whenTapped", "Any Cube"],
          ["h", "When Cozmo is %m.places", "block_whenPlace", "Picked Up"],
          ["h", "When a cliff is found", "block_whenCliff"],
          ["s"],
          ["w", "Pickup %m.cube", "block_pickedUp", "Cube #1"], //add any cube to list
          ["w", "Place held cube on %m.cube", "block_stackCube", "Cube #2"],
          [" ", "Stop everything Cozmo is doing", "block_Estop"],
          [" ", "%m.states Cozmo's free will", "block_freewill", "Enable"],
          ["s"],
          ["b", "Cozmo can see %m.objects?", "block_canSee", "Any Cube"],
          ["b", "%m.cube was tapped?", "block_wasTapped", "Cube #1"],
          ["b", "%m.objects is %m.cubeDirection of Cozmo?", "block_isDirection", "Face"],
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
