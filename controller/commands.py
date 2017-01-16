#!/usr/bin/python3

import zipfile
import os
import json

try:
    from PIL import Image
except ImportError:
    sys.exit("Cannot import from PIL: Do `pip3 install --user pillow` to install")

maxTrackSpeed = 300 # mm/s
imagepath = 'images/'
sprites = {}
costumeNum = 0

#clear image folder of old images
if not os.path.exists(imagepath):
    os.makedirs(imagepath)
'''for the_file in os.listdir(imagepath):
    file_path = os.path.join(imagepath, the_file)
    try:
        if os.path.isfile(file_path):
            os.unlink(file_path)
    except Exception as e:
        print(e)'''

def speak(cozmo, robot, data):
    return [], True, robot.say_text(data[0], in_parallel=True)

def playEmotion(cozmo, robot, data):
    trigger = 0
    if data[0] == "upset":
        trigger = cozmo.anim.Triggers.CubePounceLoseSession
    elif data[0] == "pleased":
        trigger = cozmo.anim.Triggers.BuildPyramidReactToBase
    elif data[0] == "happy":
        trigger = cozmo.anim.Triggers.BuildPyramidSuccess
    elif data[0] == "amazed":
        trigger = cozmo.anim.Triggers.MemoryMatchCozmoWinGame
    elif data[0] == "angry":
        trigger = cozmo.anim.Triggers.MemoryMatchPlayerWinGame
    elif data[0] == "bored":
        trigger = cozmo.anim.Triggers.NothingToDoBoredEvent
    elif data[0] == "startled":
        trigger = cozmo.anim.Triggers.ReactToUnexpectedMovement
    if not trigger == 0:
        return [], True, robot.play_anim_trigger(trigger, in_parallel=False)
    else:
        return [], True, False

def playAnimation(cozmo, robot, data):
    trigger = 0
    if data[0] == "greeting":
        trigger = cozmo.anim.Triggers.AcknowledgeFaceNamed
    elif data[0] == "sneeze":
        trigger = cozmo.anim.Triggers.PetDetectionSneeze
    elif data[0] == "what?":
        trigger = cozmo.anim.Triggers.CubeMovedSense
    elif data[0] == "win":
        trigger = cozmo.anim.Triggers.CubePounceWinSession
    elif data[0] == "lose":
        trigger = cozmo.anim.Triggers.CubePounceLoseSession
    elif data[0] == "facepalm":
        trigger = cozmo.anim.Triggers.FacePlantRoll
    elif data[0] == "beeping":
        trigger = cozmo.anim.Triggers.DroneModeBackwardDrivingLoop
    elif data[0] == "new object":
        trigger = cozmo.anim.Triggers.AcknowledgeObject
    elif data[0] == "lost somthing":
        trigger = cozmo.anim.Triggers.CubeMovedUpset
    elif data[0] == "reject":
        trigger = cozmo.anim.Triggers.CozmoSaysBadWord
    elif data[0] == "failed":
        trigger = cozmo.anim.Triggers.FrustratedByFailureMajor
    elif data[0] == "excited greeting":
        trigger = cozmo.anim.Triggers.MeetCozmoFirstEnrollmentCelebration
    elif data[0] == "talkative greeting":
        trigger = cozmo.anim.Triggers.InteractWithFacesInitialNamed
    if not trigger == 0:
        return [], True, robot.play_anim_trigger(trigger, in_parallel=False)
    else:
        return [], True, False

def moveDistance(cozmo, robot, data):
    distance = cozmo.util.distance_mm(float(data[0]))
    speed = max(min(float(data[1]), maxTrackSpeed), -maxTrackSpeed)
    return [], True, robot.drive_straight(distance, cozmo.util.speed_mmps(speed), in_parallel=True, should_play_anim=False)

def turnAngle(cozmo, robot, data):
    angle = cozmo.util.degrees(float(data[0]))
    return [], True, robot.turn_in_place(angle, in_parallel=True)

def drive(cozmo, robot, data):
    left = max(min(float(data[0]), maxTrackSpeed), -maxTrackSpeed)
    right = max(min(float(data[1]), maxTrackSpeed), -maxTrackSpeed)
    acc = float(data[2])
    robot.drive_wheels(left, right, l_wheel_acc=acc, r_wheel_acc=acc)
    return [], True, False

def stopDriving(cozmo, robot, data):
    robot.stop_all_motors()
    return [], True, False

def tiltHead(cozmo, robot, data):
    angle = min(cozmo.util.degrees(float(data[0])), cozmo.robot.MAX_HEAD_ANGLE)
    angle = max(angle, cozmo.robot.MIN_HEAD_ANGLE)
    return [], True, robot.set_head_angle(angle, in_parallel=True)

def liftArm(cozmo, robot, data):
    height = max(min(float(data[0]), 1), 0)
    acc = float(data[1])
    time = float(data[2])
    return [], True,robot.set_lift_height(height, accel=acc, duration=time, in_parallel=True)

def colorLight(cozmo, robot, data):
    light = data[0]
    color = data[1]
    cozmoLight = 0
    if not color == 'off':
        colorHex = color.lstrip('#')
        rgb = tuple(int(colorHex[i:i+2], 16) for i in (0, 2, 4))
        cozmoColor = cozmo.lights.Color(name="custom", rgb=rgb)
        cozmoLight = cozmo.lights.Light(on_color=cozmoColor, off_color=cozmoColor)
    if light == 'backpack' and color == 'off':
        robot.set_backpack_lights_off()
    elif light == 'backpack':
        robot.set_center_backpack_lights(cozmoLight)
    elif light == 'all cubes' and color == 'off':
        for i in (1, 2, 3):
            getCube(cozmo, robot, int(i)).set_lights_off()
    elif light == 'all cubes':
        for i in (1, 2, 3):
            getCube(cozmo, robot, int(i)).set_lights(cozmoLight)
    elif len(light) == 7 and light[0:6] == 'cube #':
        if color == 'off':
            getCube(cozmo, robot, int(light[6])).set_lights_off()
        else:
            getCube(cozmo, robot, int(light[6])).set_lights(cozmoLight)
    return [], True, False

def pickedUp(cozmo, robot, data):
    return [], True, robot.pickup_object(getCube(cozmo, robot, int(data[0])), in_parallel=True)

def stackCube(cozmo, robot, data):
    return [], True, robot.place_on_object(getCube(cozmo, robot, int(data[0])), in_parallel=True)

def Estop(cozmo, robot, data):
    robot.abort_all_actions()
    robot.stop_all_motors()
    return [], True, False

def freewill(cozmo, robot, data):
    if data[0] == 'enable':
        robot.start_freeplay_behaviors()
    else:
        robot.stop_freeplay_behaviors()
    return [], True, False

def setVolume(cozmo, robot, data):
    robot.set_robot_volume(float(data[0]))
    return [], True, False

def loadSprite(cozmo, robot, data):
    global sprites
    if os.path.isfile(data[0]):
        zf = zipfile.ZipFile(data[0], 'r')
        sprite = None
        for name in zf.namelist():
            if name.endswith('.json'):
                sprite = json.loads(zf.read(name))
        spriteName = sprite['objName'];
        for name in zf.namelist():
            if name.endswith('.png'):
                file_ = open(imagepath + spriteName + name, 'wb')
                file_.write(zf.read(name))
                file_.close()
        #print(sprite['costumes'])
        sprites[spriteName] = []
        for costume in sprite['costumes']:
            sprites[spriteName + '_' + costume['costumeName']] = imagepath + spriteName + str(costume['baseLayerID']) + '.png'
            sprites[spriteName].append(imagepath + spriteName + str(costume['baseLayerID']) + '.png')
            #print('Name: ' + costume['costumeName'])
            #print('File Path: ' + imagepath + spriteName + str(costume['baseLayerID']) + '.png')
        return [], True, False
    else:
        print('[Commands] Sprite Error. File does not exist.')
        return [], False, False

def stepCostume(cozmo, robot, data):
    global sprites, costumeNum
    if data[0] in sprites:
        length = len(sprites[data[0]])
        if costumeNum >= length:
            costumeNum = 0
        image = Image.open(sprites[data[0]][costumeNum])
        costumeNum += 1
        image = pure_pil_alpha_to_color_v2(image, color=((255, 255, 255) if data[3] == 'true' else (0, 0, 0)))
        resized_image = image.resize(cozmo.oled_face.dimensions(), Image.NEAREST)
        face_image = cozmo.oled_face.convert_image_to_screen_data(resized_image, invert_image=(data[2] == 'true'), pixel_threshold=int(data[1]))
        return [], True, robot.display_oled_face_image(face_image, 5000.0, in_parallel=True)
    else:
        print('[Commands] Sprite Error. Sprite not loaded. [' + data[0] + ']')
        return [], False, False

def showCostume(cozmo, robot, data):
    global sprites
    if (data[1] + '_' + data[0]) in sprites:
        image = Image.open(sprites[data[1] + '_' + data[0]])
        image = pure_pil_alpha_to_color_v2(image, color=((255, 255, 255) if data[4] == 'true' else (0, 0, 0)))
        resized_image = image.resize(cozmo.oled_face.dimensions(), Image.NEAREST)
        face_image = cozmo.oled_face.convert_image_to_screen_data(resized_image, invert_image=(data[3] == 'true'), pixel_threshold=int(data[2]))
        return [], True, robot.display_oled_face_image(face_image, 5000.0, in_parallel=True)
    elif not data[1] in sprites:
        print('[Commands] Sprite Error. Sprite not loaded. [' + data[1] + ']')
        return [], False, False
    else:
        print('[Commands] Sprite Error. Sprite does not have costume. [' + data[0] + ']')
        return [], False, False

def stopSprite(cozmo, robot, data):
    global costumeNum
    costumeNum = 0
    image = Image.new('RGB', cozmo.oled_face.dimensions(), (0, 0, 0))
    face_image = cozmo.oled_face.convert_image_to_screen_data(image)
    return [], True, robot.display_oled_face_image(face_image, 100.0, in_parallel=True)


def pure_pil_alpha_to_color_v2(image, color=(255, 255, 255)):
    image.load()  # needed for split()
    background = Image.new('RGB', image.size, color)
    background.paste(image, mask=image.split()[3])  # 3 is the alpha channel
    return background

def getCube(cozmo, robot, num):
    if num == 1:
        return robot.world.light_cubes[cozmo.objects.LightCube1Id]
    elif num == 2:
        return robot.world.light_cubes[cozmo.objects.LightCube2Id]
    elif num == 3:
        return robot.world.light_cubes[cozmo.objects.LightCube3Id]
    return 0
