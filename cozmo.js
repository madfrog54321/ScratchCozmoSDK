(function(ext) {
    // Cleanup function when the extension is unloaded
    ext._shutdown = function() {};

    // Status reporting code
    // Use this to report missing hardware, plugin or unsupported browser
    ext._getStatus = function() {
        return {status: 2, msg: 'Ready'};
    };

    // Block and block menu descriptions
    var descriptor = {
        blocks: [
          [' ', 'Load sprite from file %s', 'loadSprite', 'demo.sprite2'],
          [' ', 'Show costume %s of sprite %s', 'test', 'costume', 'sprite1'],
          [' ', 'Animate sprite %s at %n fps', 'test', 'sprite1', '1'],
          [' ', 'Stop animating sprite', 'test', 'sprite1', '1'],
          [' ', 'Set display threshold to %n', 'test', '100'],
        ]
    };

    // Register the extension
    ScratchExtensions.register('Sample extension', descriptor, ext);
})({});
