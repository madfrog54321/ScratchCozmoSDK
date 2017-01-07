#!/usr/bin/python3

import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.template

import tkinter
from tkinter import *
from tkinter import messagebox

import sys
import cozmo
from cozmo.util import degrees, distance_mm, speed_mmps

import threading
import time

EMPTY_CMD = 0x00

''' - - Commands - - '''

PICKED_UP = 0x01
SET_BACK_LIGHT = 0x02
TILT_HEAD = 0x03
SET_VOLUME = 0x04
SWITCH_AUTONOMOUS = 0x05
DRIVE_FORWARD = 0x06
STOP_MOTORS = 0x07
STOP_ALL = 0x08
TURN = 0x09
SET_CUBE_COLOR = 0x10
START_ANIMATION = 0x11
START_BEHAVIOR = 0x12
START_SEARCH = 0x13
MOVE_LIFT = 0x14
RAISE_LIFT = 0x15
LOWER_LIFT = 0x16
SET_MOTOR_SPEED = 0x17
SAY_TEXT = 0x18

GET_VOLTAGE = 0x19
GET_IS_MOVING = 0x20
GET_IS_AUTONOMOUS = 0x21
GET_IS_IDLE = 0x22
GET_IS_CONNECTED = 0x23

''' - - Event - - '''

PICKED_UP = 0x30
CUBE_TAPPED = 0x31
CUBE_OBSERVED = 0x32
CUBE_LOST = 0x3a
CLIFF_FOUND = 0x33

RETURN_VOLTAGE = 0x34
RETURN_IS_MOVING = 0x35
RETURN_IS_AUTONOMOUS = 0x36
RETURN_IS_IDLE = 0x37
RETURN_IS_CONNECTED = 0x38
RETURN_ACTION_DONE = 0x39

''' - - Object / States - - '''

ANY_CUBE = 0x50
CUBE_1 = 0x51
CUBE_2 = 0x52
CUBE_3 = 0x53

COLOR_WHITE = 0x54
COLOR_RED = 0x55
COLOR_GREEN = 0x56
COLOR_BLUE = 0x57
COLOR_OFF = 0x58

VOLUME_LOW = 0x59
VOLUME_MEDIUM = 0x60
VOLUME_HIGH = 0x61

WAIT = 0x62
NO_WAIT = 0x63

CONNECTED = 0x64
NOT_CONNECTED = 0X65

''' - - - - '''

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        loader = tornado.template.Loader(".")
        self.write(loader.load("index.html").generate())

class WSHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def on_cubeTapped(self, evt, *, obj, tap_count, **kwargs):
        cube = EMPTY_CMD
        if self.getCube(CUBE_1) == obj:
            cube = CUBE_1;
        elif self.getCube(CUBE_2) == obj:
            cube = CUBE_2;
        elif self.getCube(CUBE_3) == obj:
            cube = CUBE_3;
        self.write_message(str(CUBE_TAPPED) + "," + str(cube))

    def on_objectSeen(self, evt, *, image_box, obj, pose, updated):
        cube = EMPTY_CMD
        if self.getCube(CUBE_1) == obj:
            cube = CUBE_1;
        elif self.getCube(CUBE_2) == obj:
            cube = CUBE_2;
        elif self.getCube(CUBE_3) == obj:
            cube = CUBE_3;
        self.write_message(str(CUBE_OBSERVED) + "," + str(cube))

    def on_objectDisappeared(self, evt, *, obj):
        cube = EMPTY_CMD
        if self.getCube(CUBE_1) == obj:
            cube = CUBE_1;
        elif self.getCube(CUBE_2) == obj:
            cube = CUBE_2;
        elif self.getCube(CUBE_3) == obj:
            cube = CUBE_3;
        self.write_message(str(CUBE_LOST) + "," + str(cube))


    def open(self):
        global robot
        print('connection opened...')
        robot.world.add_event_handler(cozmo.objects.EvtObjectTapped, self.on_cubeTapped)
        robot.world.add_event_handler(cozmo.objects.EvtObjectAppeared, self.on_objectSeen)
        robot.world.add_event_handler(cozmo.objects.EvtObjectDisappeared, self.on_objectDisappeared)

        '''self.write_message("The server says: 'Hello'. Connection was accepted.")'''

    def on_close(self):
        print('connection closed...')

    def on_message(self, message):
        global Lcmd
        global robot
        global LLstcmd
        global behavior
        command = message.split(',')
        Lcmd['text'] = 'Command: ' + message
        length = len(command)
        if length >= 1:
            name = int(command[0])
        if length >= 2:
            data = command[1]
        if length >= 3:
            data2 = command[2]
        if length >= 4:
            doWait = int(command[3])
        action = 0
        if name == GET_IS_CONNECTED:
            if not robot:
                self.write_message(str(RETURN_IS_CONNECTED) + "," + str(NOT_CONNECTED))
            else:
                self.write_message(str(RETURN_IS_CONNECTED) + "," + str(CONNECTED))
        else:
            print("Doing command: " + message + ", Length: " + str(length))
            if name == SAY_TEXT:
                if not robot.world.active_action:
                    action = robot.say_text(data)
            elif name == SET_BACK_LIGHT:
                robot.set_all_backpack_lights(self.getColor(int(data)))
            elif name == SET_CUBE_COLOR:
                self.getCube(int(data)).set_lights(self.getColor(int(data2)))

            if not action == 0 and doWait == WAIT:
                action.wait_for_completed()

            self.write_message(str(RETURN_ACTION_DONE) + "," + str(name))
            LLstcmd['text'] = 'Last Command: ' + message
            Lcmd['text'] = 'Command: none'

    def getColor(self, code):
        color = cozmo.lights.off_light
        if code == COLOR_WHITE:
            color = cozmo.lights.white_light
        elif code == COLOR_RED:
            color = cozmo.lights.red_light
        elif code == COLOR_GREEN:
            color = cozmo.lights.green_light
        elif code == COLOR_BLUE:
            color = cozmo.lights.blue_light
        return color

    def getCube(self, code):
        if code == CUBE_1:
            return robot.world.light_cubes[cozmo.objects.LightCube1Id]
        elif code == CUBE_2:
            return robot.world.light_cubes[cozmo.objects.LightCube2Id]
        elif code == CUBE_3:
            return robot.world.light_cubes[cozmo.objects.LightCube3Id]
        return 0

application = tornado.web.Application([
    (r'/ws', WSHandler),
    (r'/', MainHandler),
    (r"/(.*)", tornado.web.StaticFileHandler, {"path": "./resources"}),
])

def startServer():
    application.listen(8765)
    tornado.ioloop.IOLoop.instance().start()
    print('Server stopped')

def stopServer():
    print('Stopping server...')
    tornado.ioloop.IOLoop.instance().stop()

def run(sdk_conn):
    global robot
    global shutdown
    global L
    robot = sdk_conn.wait_for_robot()
    cozmo.objects.OBJECT_VISIBILITY_TIMEOUT = 5
    print("Connected to {!s}".format(robot))
    L['text'] = 'Status: connected'
    while not shutdown and sdk_conn.is_connected:
        time.sleep(1)
    print('disconnect from robot')
    robot = False
    L['text'] = 'Status: disconnected'

behavior = 0
robot = 0
shutdown = False
L = 0
Lcmd = 0
LLstcmd = 0

def startCozmo():
    global L
    global shutdown
    while not shutdown:
        L['text'] = 'Status: searching...'
        time.sleep(2)
        try:
            cozmo.connect(run)
        except cozmo.ConnectionError as e:
            print("Cozmo not found")

def stopCozmo():
    global shutdown
    shutdown = True;

if __name__ == "__main__":
    window = tkinter.Tk()
    window.geometry("300x300")
    L = Label(window, text="Status: unknown")
    L.place(x = 10, y = 10)
    Lcmd = Label(window, text='Command: none')
    Lcmd.place(x = 10, y = 30)
    LLstcmd = Label(window, text='Last Command: none')
    LLstcmd.place(x = 10, y = 50)
    def close():
            window.destroy()
    B = Button(window, text = "Close", command = close)
    B.place(x=10,y=70)

    threading.Thread(target=startCozmo).start()
    threading.Thread(target=startServer).start()

    window.mainloop()

    stopCozmo()
    stopServer()
