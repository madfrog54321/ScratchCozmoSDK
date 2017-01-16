var socket;
var robot = false;

function stopMotors(){
  socket.send('stop,-,-,-,continue');
};

function setColor(back, front, text, loading, button){
  $("body").css("background-color",back);
  $(".cube1").css("background-color",front);
  $(".cube2").css("background-color",front);
  $(".step").css("color",front);
  $(".info").css("color",front);
  $(".step").html(text);
  $(".spinner").css("display", (loading ? "" : "none"));
  $(".stopButton").css("display", (button ? "" : "none"));
  $(".editorList").css("display", (button ? "" : "none"));
  $(".deviceInfo").css("display", (button ? "" : "none"));
  //$(".cozmo").css("display", (button ? "" : "none"));
}

function goRed(){
  setColor("#FF4136", "white", "Looking for Cozmo...", true, false);
};

/*
function goYellow(){
  setColor("#FFDC00", "black", "Waiting for Scratch...", true, false);
};
*/

function goGreen(){
  setColor("#2ECC40", "white", "Let's program Cozmo! Choose your editor...", false, true);
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
    console.log(event.data);
    var command = event.data.split(",");
    var name = command[0];
    if(name === 'cozmo'){
      if(command[1] === 'connected'){
        robot = true;
      }else if(command[1] === 'waiting'){
        robot = false;
      }
    }
    if(robot){
      goGreen();
    }else if(!robot){
      goRed();
    }else {
      goBlack();
    }
  };
};

goBlack();
startSocket();
