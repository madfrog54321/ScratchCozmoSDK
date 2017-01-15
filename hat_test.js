(function(ext) {

  var data = 0;
  var bool = true;
  var seen = false;

  ext.seen = function(){
    var booled = bool;
    bool = false;
    return booled;
  };

  ext.check = function(callback){
    data = 10;
    console.log('check 1');
    console.log(seen);
    setTimeout(function() {
      callback();
      console.log('check 2');
      console.log(seen);
      data = 0;
    }, 1000);
  };

  ext.cube = function(){
    seen = true;
    console.log('cube');
    return data;
  };

  // Block and block menu descriptions
  var descriptor = {
      blocks: [
          // Block type, block name, function name, param1 default value, param2 default value
          ['h', 'When cube seen %b[1]', 'seen'],
          ['w', 'Check seen cube', 'check'],
          ['r', 'Cube seen', 'cube']
      ]
  };
  // Register the extension
  ScratchExtensions.register('Cozmo', descriptor, ext);

})({});
