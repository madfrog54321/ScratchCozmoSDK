var socket;
var robot = false;
var client = false;

function stopMotors(){
  socket.send('stop,-,-,-,continue');
};

function setColor(back, front, text, loading, button){
  $("body").css("background-color",back);
  $(".cube1").css("background-color",front);
  $(".cube2").css("background-color",front);
  $(".step").css("color",front);
  $(".info").css("color",front);
  $(".step").text(text);
  $(".spinner").css("display", (loading ? "block" : "none"));
  $(".stopButton").css("display", (button ? "block" : "none"));
}

function goRed(){
  setColor("#FF4136", "white", "Waiting for phone...", true, false);
};

function goYellow(){
  setColor("#FFDC00", "black", "Waiting for Scratch...", true, false);
};

function goGreen(){
  setColor("#2ECC40", "white", "Time to program!", false, true);
};

function goBlack(){
  setColor("#111111", "white", "Connecting to Cozmo controller...", true, false);
};

var startSocket = function(){
  socket = new WebSocket('ws://127.0.0.1:9090/ws'); // connect to controller

  var connected = false;

  socket.onopen = function(event){
    connected = true;
    goRed();
    socket.send('webApp');
  };

  socket.onclose = function(event){
    goBlack();
    if(!connected)
      setTimeout(startSocket, 2000); // try again to connect to controller
    else
      close();
  };

  socket.onmessage = function(event) {
    var command = event.data.split(",");
    var name = command[0], kind = command[1], status = command[2];
    if(name === 'status'){
      if(kind === 'robot'){
        if(status === 'connected'){
          robot = true;
        }else if(status === 'waiting'){
          robot = false;
        }
      } else if(kind === 'client'){
        if(status === 'connected'){
          client = true;
        }else if(status === 'waiting'){
          client = false;
        }
      }
      if(!robot){
        goRed();
      }else if(!client){
        goYellow();
      }else if(robot && client){
        goGreen();
      }else {
        goBlack();
      }
    }
  };
};

goBlack();
startSocket();
