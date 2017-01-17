# Scratch Extension for Cozmo

Expand your Cozmo's abilities with this Scratch extension. With Scratch's drag-and-drop editor, programming your Cozmo robot can now be done within minutes.

## Install

1. Install [Python](https://www.python.org/)

2. Install extra python libraries

```
$ pip3 install --user tornado pillow numpy cozmo[camera] netifaces
```

3. Connect Cozmo to your phone/tablet with the app

4. Download the [last release](https://github.com/madfrog54321/ScratchCozmoSDK/archive/v2.0.0.zip) of `Cozmo Controller` app, or [current dev version](https://github.com/madfrog54321/ScratchCozmoSDK/archive/gh-pages.zip).

5. Unzip the file

6. Run `Cozmo_Controller.py`: ```python3 Cozmo_Controller.py```

*Allowing Cozmo Controller through your firewall allows for other devices to talk to the Cozmo Controller app.*
If access from outside your local network is required you need to provide your external hostname/ip-address to `Cozmo Controller` app:
```
python3 Cozmo_Controller.py <your_external_hostname/ip-address>
```
