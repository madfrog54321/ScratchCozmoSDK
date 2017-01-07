#!/usr/bin/python3

from controller import server
import sys
import cozmo
from cozmo.util import degrees, distance_mm, speed_mmps
import threading
import time

commander = 0
shutdown = False
robot = False
currentAction = 0
currentActionType = '-';

'''cozmo's leds flicker if their brightness value is less than 120'''
def fixColor(color):
    return color
    if color <= 60:
        return 0
    elif color <= 120:
        return 120
    else:
        return color

def actionDone(self, action, failure_code, failure_reason, state):
    global currentAction
    global currentActionType
    global commander
    currentAction = 0
    commander.sendToClient('done,' + currentActionType + ',-')

def handleCommand(command):
    global currentAction
    global currentActionType
    global robot
    print(command)
    # --- split command into individual values ---
    message = command.split(',')
    name = message[0]
    data1 = message[1]
    data2 = message[2]
    data3 = message[3]
    wait = message[4]
    action = 0
    try:
        # have cozmo say the text in data1
        # speak,[text to say],-,-,[wait, continue]
        # speak,hello world,-,-,wait
        if name == 'speak' and robot:
            action = robot.say_text(data1)

        # set the 3 main backpack lights to the hex color given
        # backlight,[hex color],-,-,continue
        # backlight,#FF0000,-,-,continue
        elif name == 'backlight' and robot:
            if data1 == 'off':
                robot.set_backpack_lights_off()
            else:
                colorHex = data1.lstrip('#')
                rgb = tuple(fixColor(int(colorHex[i:i+2], 16)) for i in (0, 2 ,4))
                color = cozmo.lights.Color(name="color", rgb=rgb)
                light = cozmo.lights.Light(on_color=color, off_color=color)
                off = cozmo.lights.off_light
                robot.set_backpack_lights(off, light, light, light, off)

        # set the 4 leds on a light cube to the hex color given
        # cubelight,[cube number],[hex color],-,continue
        # cubelight,1,#FF0000,-,continue
        elif name == 'cubeLight' and robot:
            if data2 == 'off':
                getCube(int(data1)).set_lights_off()
            else:
                colorHex = data2.lstrip('#')
                rgb = tuple(fixColor(int(colorHex[i:i+2], 16)) for i in (0, 2 ,4))
                color = cozmo.lights.Color(name="color", rgb=rgb)
                getCube(int(data1)).set_lights(cozmo.lights.Light(on_color=color, off_color=color))

        # tilt cozmo's head to the given angle
        # tilt,[angle in degrees],-,-,[wait, continue]
        # tilt,20,-,-,wait
        elif name == 'tilt' and robot:
            angle = degrees(float(data1))
            if angle > cozmo.robot.MAX_HEAD_ANGLE:
                angle = cozmo.robot.MAX_HEAD_ANGLE
            elif angle < cozmo.robot.MIN_HEAD_ANGLE:
                angle = cozmo.robot.MIN_HEAD_ANGLE
            action = robot.set_head_angle(angle)

        # drive forward the given distance at the given speed
        # drive,[distance in mm],[speed in mm/s],-,[wait, continue]
        # drive,100,50,-,wait
        elif name == 'drive' and robot:
            action = robot.drive_straight(distance_mm(float(data1)), speed_mmps(float(data2)), False)

        # turn by the angle given
        # turn,[angle to turn],-,-,[wait, continue]
        # turn,90,-,-,wait
        elif name == 'turn' and robot:
            action = robot.turn_in_place(degrees(float(data1)))

        # stop the current action and all motors
        # stop,-,-,-,continue
        elif name == 'stop' and robot:
            if not currentAction == 0:
                currentAction.abort()
            robot.stop_all_motors()

        # set cozmo's volume
        # volume,[volume from 0.0 to 1.0],-,-,continue
        # volume,0.5,-,-,continue
        elif name == 'volume' and robot:
            robot.set_robot_volume(float(data1))

        # enable cozmo's normal behaviors and reactions
        # freewill,[enable, disable],-,-,continue
        # freewill,enable,-,-,continue
        elif name == 'freewill' and robot:
            if data1 == 'enable':
                robot.start_freeplay_behaviors()
            else:
                robot.stop_freeplay_behaviors()

        # set cozmo's lift to a spesific height
        # lift,[height from 0.0 to 1.0],-,-,[wait, continue]
        # lift,0.5,-,-,wait
        elif name == 'lift' and robot:
            height = float(data1)
            if height > 1:
                height = 1
            elif height < 0:
                height = 0
            action = robot.set_lift_height(height, accel=100.0, max_speed=100.0, duration=0.5)

        # pickup a light cube [cozmo must know where it is]
        # pickup,[cube number],-,-,[wait, continue]
        # pickup,1,-,-,wait
        elif name == 'pickup' and robot:
            action = robot.pickup_object(getCube(int(data1)))

        else:
            print('Unkown command: ' + command)

        # --- setup callback for action if command asked for wait ---
        if not action == 0 and wait == 'wait':
            if not currentAction == 0:
                currentAction.abort()
            currentActionType = name
            currentAction = action
            currentAction.on_completed(actionDone)
    except cozmo.exceptions.RobotBusy as e:
        print('[Error] Cozmo is currently doing an action.')

def on_cubeTapped(evt, *, obj, tap_count, **kwargs):
    cube = 'none'
    if getCube(1) == obj:
        cube = 'cube1';
    elif getCube(2) == obj:
        cube = 'cube2';
    elif getCube(3) == obj:
        cube = 'cube3';
    commander.sendToClient('tapped,' + cube + ',yes')

def run(sdk_conn):
    global robot
    global shutdown
    robot = sdk_conn.wait_for_robot()
    robot.world.add_event_handler(cozmo.objects.EvtObjectTapped, on_cubeTapped)
    print("Connected to {!s}".format(robot))
    commander.setRobotStatus(True)
    while not shutdown and sdk_conn.is_connected:
        time.sleep(1)
    print('disconnect from robot')
    commander.setRobotStatus(False)
    robot = False

def startCozmo():
    global shutdown
    while not shutdown:
        time.sleep(2)
        try:
            cozmo.connect(run)
        except cozmo.ConnectionError as e:
            print("Cozmo not found")

def stopThreads():
    global shutdown
    shutdown = True;

def getCube(num):
    global robot
    if num == 1:
        return robot.world.light_cubes[cozmo.objects.LightCube1Id]
    elif num == 2:
        return robot.world.light_cubes[cozmo.objects.LightCube2Id]
    elif num == 3:
        return robot.world.light_cubes[cozmo.objects.LightCube3Id]
    return 0

def startWatcher():
    global robot
    global shutdown
    global commander
    while not shutdown:
        time.sleep(0.5)
        if robot:
            commander.sendToClient('voltage,-,' + str(robot.battery_voltage))
            if robot.is_picked_up:
                commander.sendToClient('pickedUp,-,yes')
            if robot.is_cliff_detected:
                commander.sendToClient('cliff,-,yes')
            if robot.is_cliff_detected:
                commander.sendToClient('cliff,-,yes')
            if robot.world.visible_face_count() > 0:
                commander.sendToClient('see,face,yes')
            else:
                commander.sendToClient('see,face,no')
            if robot.world.visible_pet_count() > 0:
                commander.sendToClient('see,pet,yes')
            else:
                commander.sendToClient('see,pet,no')
            cubes = [False, False, False, False]
            for obj in robot.world.visible_objects:
                if obj == getCube(1):
                    cubes[0] = True
                elif obj == getCube(2):
                    cubes[1] = True
                elif obj == getCube(3):
                    cubes[2] = True
                elif obj == robot.world.charger:
                    cubes[3] = True
            commander.sendToClient('see,cube1,' + ('yes' if cubes[0] else 'no'))
            commander.sendToClient('see,cube2,' + ('yes' if cubes[1] else 'no'))
            commander.sendToClient('see,cube3,' + ('yes' if cubes[2] else 'no'))
            commander.sendToClient('see,charger,' + ('yes' if cubes[3] else 'no'))

if __name__ == "__main__":
    print('=== Cozmo Controller v0.2.8 ===')

    threading.Thread(target=startCozmo).start()
    threading.Thread(target=startWatcher).start()

    commander = server.Server(handleCommand)
    commander.start()
    stopThreads()
