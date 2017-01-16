#!/usr/bin/python3

try:
    import tornado.ioloop
    import tornado.web
    import tornado.websocket
    import tornado.template
except ImportError:
    sys.exit("Cannot import Tornado: Do `pip3 install --user tornado` to install")

import webbrowser
import os
import socket

if os.name != "nt":
    import fcntl
    import struct
    def get_interface_ip(ifname):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        return socket.inet_ntoa(fcntl.ioctl(s.fileno(), 0x8915, struct.pack('256s',ifname[:15]))[20:24])

def get_lan_ip():
    ip = socket.gethostbyname(socket.gethostname())
    if ip.startswith("127.") and os.name != "nt":
        interfaces = ["eth0","eth1","eth2","wlan0","wlan1","wifi0","ath0","ath1","ppp0",]
        for ifname in interfaces:
            try:
                ip = get_interface_ip(ifname)
                break
            except IOError:
                pass
    return ip

serverIP = get_lan_ip()
clients = []
apps = []
robotStatus = False
clientStatus = False
commandHandler = 0
cameraHandler = 0
clientCount = 0

class Server:
    def __init__(self, handler, camera):
        global commandHandler
        global cameraHandler
        commandHandler = handler
        cameraHandler = camera

    def setRobotStatus(self, status):
        global robotStatus
        robotStatus = status
        self.sendToApp('cozmo,' + ('connected' if status else 'waiting'))
        self.sendToClient('cozmo,' + ('connected' if status else 'waiting'))

    def sendToApp(self, command):
        global apps
        for app in apps:
            app.write_message(command)

    def sendToClient(self, command):
        global clients
        for client in clients:
            client.write_message(command)

    class MainHandler(tornado.web.RequestHandler):
        def get(self):
            loader = tornado.template.Loader(".")
            self.write(loader.load("Web App/index.html").generate(ipAddress=serverIP))

    class BlocklyHandler(tornado.web.RequestHandler):
        def get(self):
            loader = tornado.template.Loader(".")
            self.write(loader.load("Web App/blockly/blockly.html").generate())

    class StreamHandler(tornado.web.RequestHandler):
        def get(self):
            loader = tornado.template.Loader(".")
            argument = self.get_argument("image",  default=None)
            if not argument == None:
                global cameraHandler
                image = cameraHandler()
                if image == None:
                    self.clear()
                    self.set_status(204)
                else:
                    self.write(image)
                    self.set_header("Content-type",  "image/png")
            else:
                self.write(loader.load("Web App/stream/index.html").generate())

    class WSHandler(tornado.websocket.WebSocketHandler):
        def __init__(self, a, b):
            self.isApp = False
            self.isClient = False
            super(Server.WSHandler, self).__init__(a, b)

        def check_origin(self, origin):
            return True

        def open(self):
            '''self.write_message("The server says: 'Hello'. Connection was accepted.")'''

        def on_close(self):
            if(self.isApp):
                global apps
                apps.remove(self)
                print('[Server] Web app closed. Stopping server...')
                tornado.ioloop.IOLoop.instance().stop()
            elif(self.isClient):
                global clients
                clients.remove(self)
                if(len(clients) == 0):
                    clientStatus = False
                    for app in apps:
                        app.write_message('client,waiting')
                print('[Server] Client closed')

        def on_message(self, message):
            global clientStatus
            global robotStatus
            if(message == 'webApp'):
                print('[Server] Connected to web app')
                global apps
                apps.append(self)
                self.isApp = True
            elif(message == 'client'):
                print('[Server] Connected to client')
                global clients
                clientStatus = True
                clients.append(self)
                self.isClient = True
                for app in apps:
                    app.write_message('client,connected')
            else:
                global commandHandler
                commandHandler(message)
            if(message == 'webApp' or message == 'client'):
                global clientCount
                self.write_message('id,' + str(clientCount));
                clientCount += 1;
                self.write_message('cozmo,' + ('connected' if robotStatus else 'waiting'))
                self.write_message('client,' + ('connected' if clientStatus else 'waiting'))

    def start(self):
        application = tornado.web.Application([
        (r'/ws', Server.WSHandler),
        (r'/', Server.MainHandler),
        (r'/blockly', Server.BlocklyHandler),
        (r'/blockly/code/(.*)', tornado.web.StaticFileHandler, {'path': 'blockly'}),
        (r'/stream', Server.StreamHandler),
        (r'/stream/(.*)', tornado.web.StaticFileHandler, {'path': 'Web App/stream'}),
        (r'blockly/code/msg/js/(en.js)', tornado.web.StaticFileHandler, {'path': 'blockly/msg/js'}),
        (r'/(theme\.css)', tornado.web.StaticFileHandler, {'path': 'Web App'}),
        (r'/(connector\.js)', tornado.web.StaticFileHandler, {'path': 'Web App'}),
        (r'/image/(scratch\.png)', tornado.web.StaticFileHandler, {'path': 'Web App/images'}),
        (r'/image/(blockly\.png)', tornado.web.StaticFileHandler, {'path': 'Web App/images'}),
        (r'/image/(cozmo\.png)', tornado.web.StaticFileHandler, {'path': 'Web App/images'}),
        ])
        print('[Server] Starting server...')
        application.listen(9090)
        print('[Server] Server ready at address: localhost:9090')
        print('[Server] Websockets ready at address: localhost:9090/ws')
        webbrowser.open('http://localhost:9090')
        print('[Server] Web browser openned to: http://localhost:9090')
        tornado.ioloop.IOLoop.instance().start()
        print('[Server] Server stopped')

    def stop(self):
        tornado.ioloop.IOLoop.instance().stop()
