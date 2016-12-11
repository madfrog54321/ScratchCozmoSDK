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

class MainHandler(tornado.web.RequestHandler):
    def get(self):
        loader = tornado.template.Loader(".")
        self.write(loader.load("index.html").generate())

class WSHandler(tornado.websocket.WebSocketHandler):
    def check_origin(self, origin):
        return True

    def open(self):
        print('connection opened...')
        '''self.write_message("The server says: 'Hello'. Connection was accepted.")'''

    def on_message(self, message):
        global Lcmd
        command = message.split(',')
        if(message == "status"):
            if not robot:
                self.write_message('no robot')
            else:
                self.write_message('robot')
        else:
            Lcmd['text'] = 'Command: ' + message
            try:
                exec('robot' + message)
            except Exception as e:
                '''print("Error running command: " + e)'''

            LLstcmd['text'] = 'Last Command: ' + message
            Lcmd['text'] = 'Command: none'
            self.write_message('done')
        '''self.write_message("The server says: " + message + " back at you")'''
        '''print('received:', command)'''

    def on_close(self):
        print('connection closed...')

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
    print("Connected to {!s}".format(robot))
    L['text'] = 'Status: connected'
    while not shutdown and sdk_conn.is_connected:
        time.sleep(1)
    print('disconnect from robot')
    robot = False
    L['text'] = 'Status: disconnected'

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
