# Graphical Programming for Cozmo

Get kids involved with programming and robotics. Using Scratch's drag-and-drop editor, programming Cozmo is now as easy as snapping blocks together.
Give kids the ability to use programming to interact with the real world. Learning programming on websites is educational, but boring.
Kids need something tangible to play with, and fully appreciate. Cozmo brings programming into the real world.
He is aware of his environment, and can interact with it. So lets get playing ... I mean programming.

## Install

1. Follow the [install guide](http://cozmosdk.anki.com/docs/initial.html) for the Cozmo SDK

2. Install extra Python libraries
    ```
    $ pip3 install --user tornado pillow numpy cozmo[camera]
    ```
3. Connect Cozmo to your phone/tablet with the Cozmo app

4. Download the [last release](https://github.com/madfrog54321/ScratchCozmoSDK/archive/master.zip)

5. Unzip the file

6. Run the Cozmo Controller app:
    ```
    $ python3 Cozmo_Controller.py
    ```
7. Plug your phone/tablet into your computer

#### Want to control Cozmo over the internet?
Forward TCP port 9090 (that's what Cozmo_Controller listens on) on your router from your external IP-address to your local machine's IP-address (internal) and use the following URL in a browser on remote machine:
```
http://your_external_ip_address:9090
```
When ScratchX interface is loaded and Cozmo blocks are showing add the `Remote Cozmo at <hostname>` block (the very last on the list) and set it to your external IP-address. Click on the block to apply the new address.

## Developers
The [current dev version](https://github.com/madfrog54321/ScratchCozmoSDK/archive/develop.zip) can be found on the [develop branch](https://github.com/madfrog54321/ScratchCozmoSDK/tree/develop).
