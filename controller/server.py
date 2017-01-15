#!/usr/bin/python3

import tornado.ioloop
import tornado.web
import tornado.websocket
import tornado.template
import webbrowser

clients = []
apps = []
robotStatus = False
clientStatus = False
commandHandler = 0
clientCount = 0

class Server:
    def __init__(self, handler):
        global commandHandler
        commandHandler = handler

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
            self.write(loader.load("Web App/index.html").generate())

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
        (r'/(theme\.css)', tornado.web.StaticFileHandler, {'path': 'Web App'}),
        (r'/(connector\.js)', tornado.web.StaticFileHandler, {'path': 'Web App'}),
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
