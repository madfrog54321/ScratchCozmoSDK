#!/usr/bin/env python3

import cozmo


def cozmo_program(robot: cozmo.robot.Robot):
    robot.play_anim_trigger(cozmo.anim.Triggers.UnitTestAnim).wait_for_completed()

cozmo.run_program(cozmo_program)
