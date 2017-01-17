# Scratch Extension for Cozmo

Expand your Cozmo's abilities with this Scratch extension. With Scratch's drag-and-drop editor, programming your Cozmo robot can now be done within minutes.

## Install

1. Follow the [install guide](http://cozmosdk.anki.com/docs/initial.html) for the Cozmo SDK

2. Install extra python libraries

```
$ pip3 install --user tornado pillow numpy cozmo[camera] netifaces
```

3. Connect Cozmo to your phone/tablet with the Cozmo app

4. Download the [last release](https://github.com/madfrog54321/ScratchCozmoSDK/archive/master.zip) of `Cozmo Controller` app, or [current dev version](https://github.com/madfrog54321/ScratchCozmoSDK/archive/develop.zip).

5. Unzip the file

6. Run `Cozmo_Controller.py`: ```python3 Cozmo_Controller.py```

7. Plug your phone/tablet to your computer

*Allowing Cozmo Controller through your firewall allows for other devices to talk to the Cozmo Controller app.*

#### Want to control Cozmo over the internet?
Provide your external hostname/ip-address to `Cozmo Controller` app:
```
python3 Cozmo_Controller.py <your_external_hostname/ip-address>
```
