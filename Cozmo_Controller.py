#!/usr/bin/python3

from controller import server
from controller import commands
import sys
try:
    import cozmo
    from cozmo.util import degrees, distance_mm, speed_mmps
except ImportError:
    sys.exit("Cannot import Cozmo: Do `pip3 install --user cozmo[camera]` to install")
import threading
import time
import queue
from functools import partial
import math
import io
import argparse

updateCount = 0
failedCount = 0
commander = 0
robot = 0
shutdown = False
commandQueue = queue.Queue()
pendingCommand = False
maxTrackSpeed = 300 # mm/s

commandSpeed = 20 # commands per second
statusSpeed = 2 # status updates per seccond
maxFailedTime = 10 # max time before moving to the next command

def getLoopDelay():
    return 1 / commandSpeed

def getStatusCount():
    return commandSpeed / statusSpeed

def getMaxFailedCount():
    return commandSpeed * maxFailedTime

class ParsedCommand:
    def __init__(self, command):
        splitCommand = command.split(',')
        if len(splitCommand) > 0:
            self.name = splitCommand[0];
            self.data = splitCommand[3:];
            self.ID = int(splitCommand[2]);
            self.client = int(splitCommand[1]);
        else:
            self.name = '';
            self.data = [];
            self.ID = 0;
            self.client = 0;
        self.raw = command;

def handleCommand(message):
    commandQueue.put(ParsedCommand(message))
    print('[Server] Received Command: ' + message)

def handleCamera():
    global robot
    if not robot == 0 and not robot.world.latest_image == None:
        fobj = io.BytesIO()
        robot.world.latest_image.raw_image.save(fobj, format="jpeg")
        return fobj.getvalue()
    return None

def on_cubeTapped(evt, *, obj, tap_count, **kwargs):
    cube = 0
    for i in (1, 2, 3):
        if getCube(i) == obj:
            cube = i;
    commander.sendToClient('tapped,' + str(cube))

def getDirectionToCube(robot, num):
    cube = getCube(num)
    if not cube.pose == None and cube.pose.is_valid and cube.is_visible:
        cubeLoc = cube.pose.position
        cozmoLoc = robot.pose.position
        cozmoRot = robot.pose.rotation.angle_z.radians
        deltaX = cubeLoc.x - cozmoLoc.x
        deltaY = cubeLoc.y - cozmoLoc.y
        cubeDir = math.atan2(deltaY, deltaX) - cozmoRot
        if cubeDir < -0.174533:
            return 3
        elif cubeDir > 0.174533:
            return 1
        elif cubeDir >= -0.174533 and cubeDir <= 0.174533:
            return 2
        else:
            return 0
    else:
        return 0



# status,[voltage],[onTable],[onSide],[onTracks],[seeCliff],[seeFace], ...
# ... [seePet],[seeCube1],[seeCube2],[seeCube3],[seeCharger]
def sendRobotStatus(robot):
    status = ['-'] * 15
    status[0] = 'status'
    status[1] = robot.battery_voltage
    status[2] = not robot.is_picked_up
    status[3] = abs(robot.accelerometer.y) > 9000
    status[4] = robot.is_picked_up
    status[5] = robot.is_cliff_detected
    status[6] = robot.world.visible_face_count() > 0
    status[7] = robot.world.visible_pet_count() > 0
    for obj in robot.world.visible_objects:
        if obj == getCube(1):
            status[8] = True
        elif obj == getCube(2):
            status[9] = True
        elif obj == getCube(3):
            status[10] = True
        elif obj == robot.world.charger:
            status[11] = True
    status[12] = getDirectionToCube(robot, 1)
    status[13] = getDirectionToCube(robot, 2)
    status[14] = getDirectionToCube(robot, 3)
    message = ','.join(map(str,status))
    commander.sendToClient(message)

def getCube(num):
    if num == 1:
        return robot.world.light_cubes[cozmo.objects.LightCube1Id]
    elif num == 2:
        return robot.world.light_cubes[cozmo.objects.LightCube2Id]
    elif num == 3:
        return robot.world.light_cubes[cozmo.objects.LightCube3Id]
    return 0

def buildReturnMessage(command, completed, data):
    message = 'finished,'
    message += command.name
    message += ',' + str(command.client)
    message += ',' + str(command.ID)
    message += ',' + ('completed' if completed else 'error')
    message += ',' + ','.join(map(str,data))
    return message

def actionCallback(command, bob, **kwargs):
    completed = True if kwargs['state'] == cozmo.action.ACTION_SUCCEEDED else False
    data = [] if kwargs['state'] == cozmo.action.ACTION_SUCCEEDED else [kwargs['failure_reason']]
    message = buildReturnMessage(command, completed, data)
    commander.sendToClient(message)

def runCommand(robot, command):
    global pendingCommand, failedCount
    print('[Robot] Running Command: ' + command.raw)
    data = []
    completed = True
    action = False
    try:
        if command.name == 'cmd/sec':
            global commandSpeed
            commandSpeed = float(command.data[0])
        elif command.name == 'update/sec':
            global statusSpeed
            statusSpeed = int(round(float(command.data[0])))
        elif command.name == 'maxFailed':
            global maxFailedTime
            maxFailedTime = int(round(float(command.data[0])))
        elif command.name == 'speak':
            data, completed, action = commands.speak(cozmo, robot, command.data)
        elif command.name == 'playEmotion':
            data, completed, action = commands.playEmotion(cozmo, robot, command.data)
        elif command.name == 'playAnimation':
            data, completed, action = commands.playAnimation(cozmo, robot, command.data)
        elif command.name == 'moveDistance':
            data, completed, action = commands.moveDistance(cozmo, robot, command.data)
        elif command.name == 'turnAngle':
            data, completed, action = commands.turnAngle(cozmo, robot, command.data)
        elif command.name == 'drive':
            data, completed, action = commands.drive(cozmo, robot, command.data)
        elif command.name == 'stopDriving':
            data, completed, action = commands.stopDriving(cozmo, robot, command.data)
        elif command.name == 'tiltHead':
            data, completed, action = commands.tiltHead(cozmo, robot, command.data)
        elif command.name == 'liftArm':
            data, completed, action = commands.liftArm(cozmo, robot, command.data)
        elif command.name == 'colorLight':
            data, completed, action = commands.colorLight(cozmo, robot, command.data)
        elif command.name == 'pickedUp':
            data, completed, action = commands.pickedUp(cozmo, robot, command.data)
        elif command.name == 'stackCube':
            data, completed, action = commands.stackCube(cozmo, robot, command.data)
        elif command.name == 'Estop':
            data, completed, action = commands.Estop(cozmo, robot, command.data)
        elif command.name == 'freewill':
            data, completed, action = commands.freewill(cozmo, robot, command.data)
        elif command.name == 'setVolume':
            data, completed, action = commands.setVolume(cozmo, robot, command.data)
        elif command.name == 'loadSprite':
            data, completed, action = commands.loadSprite(cozmo, robot, command.data)
        elif command.name == 'showCostume':
            data, completed, action = commands.showCostume(cozmo, robot, command.data)
        elif command.name == 'stepCostume':
            data, completed, action = commands.stepCostume(cozmo, robot, command.data)
        elif command.name == 'stopSprite':
            data, completed, action = commands.stopSprite(cozmo, robot, command.data)
        else:
            print('[Robot] Unkown command: ' + command.raw)

        failedCount = 0
        pendingCommand = False
        if action:
            callback = partial(actionCallback, command)
            action.add_event_handler(cozmo.action.EvtActionCompleted, callback)
        else:
            message = buildReturnMessage(command, completed, data)
            commander.sendToClient(message)
    except cozmo.exceptions.RobotBusy as e:
        if failedCount < getMaxFailedCount():
            print('[RobotBusy] Action failed. Will atempt again on next loop.')
            pendingCommand = command
            failedCount += 1
        else:
            print('[RobotBusy] Action Failed. Moving to next command.')
            message = buildReturnMessage(command, False, [])
            commander.sendToClient(message)
            pendingCommand = False
            failedCount = 0

def cozmo_program(sdk_conn):
    global updateCount, robot
    robot = sdk_conn.wait_for_robot()
    print("[Robot] Connected to Cozmo!")
    robot.say_text('i am connected')
    robot.camera.image_stream_enabled = True
    commander.setRobotStatus(True)
    robot.world.add_event_handler(cozmo.objects.EvtObjectTapped, on_cubeTapped)
    while not shutdown and robot.conn.is_connected:
        time.sleep(getLoopDelay())
        try:
            if pendingCommand == False:
                command = commandQueue.get_nowait()
                runCommand(robot, command)
            else:
                runCommand(robot, pendingCommand)
        except queue.Empty as e:
            pass
        except:
            print('[Error] Command failed. Unkown reason.')
        if updateCount >= getStatusCount():
            sendRobotStatus(robot)
            updateCount = 0
        else:
            updateCount += 1
    print('[Robot] Disconnected from Cozmo')
    commander.setRobotStatus(False)

def startCozmo():
    global shutdown
    cozmo.setup_basic_logging(general_log_level='CRITICAL', protocol_log_level='CRITICAL')
    while not shutdown:
        time.sleep(2)
        try:
            cozmo.run.connect(cozmo_program)
        except cozmo.SDKVersionMismatch as e:
            print("[Error] Update both Cozmo's app and the Cozmo SDK")
        except cozmo.NoDevicesFound as e:
            print("[Notice] No phone running Cozmo's app found. Waiting for phone...")
        except cozmo.ConnectionAborted as e:
            print('[Error] Cozmo was disconnected')
        except cozmo.ConnectionCheckFailed as e:
            print('[Error] Connection to Cozmo failed')
        except cozmo.ConnectionError as e:
            print('[Error] Connection to Cozmo failed')
        except cozmo.SDKShutdown as e:
            print('[Error] SDK is closing')

if __name__ == "__main__":
    print('=== Cozmo Controller v0.2.8 ===')

    parser = argparse.ArgumentParser(description='Cozmo_Controller')
    parser.add_argument('externalHostname', metavar='externalHostname', nargs='?', default='localhost',
                        help='external hostname/ip-address the application can be accesed by')

    args = parser.parse_args()

    threading.Thread(target=startCozmo).start()

    commander = server.Server(handleCommand, handleCamera, args.externalHostname)
    commander.start()
    shutdown = True;
