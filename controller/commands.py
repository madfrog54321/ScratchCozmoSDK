#!/usr/bin/python3

maxTrackSpeed = 300 # mm/s

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
    return [], True, robot.pickup_object(getCube(cozmo, robot, int(data[0])))

def stackCube(cozmo, robot, data):
    return [], True, robot.place_on_object(getCube(cozmo, robot, int(data[0])), in_parallel=False)

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




def getCube(cozmo, robot, num):
    if num == 1:
        return robot.world.light_cubes[cozmo.objects.LightCube1Id]
    elif num == 2:
        return robot.world.light_cubes[cozmo.objects.LightCube2Id]
    elif num == 3:
        return robot.world.light_cubes[cozmo.objects.LightCube3Id]
    return 0
