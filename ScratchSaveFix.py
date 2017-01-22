import tkinter as tk
from tkinter import filedialog
import zipfile
import json
import os

new_extension = "http://madfrog54321.github.io/ScratchCozmoSDK/Cozmo_Extension.js"

root = tk.Tk()
root.withdraw()
file_path = filedialog.askopenfilename()
print("Fixing project file: " + file_path)

project_json = ""
zf = zipfile.ZipFile(file_path, 'r')
print("-- Found files in project --")
for name in zf.namelist():
    print("-> " + name)
    if name.endswith('project.json'):
        project_json = name
print("Editing config file: " + project_json)
raw_json = zf.read(project_json)
json_object = json.loads(raw_json)
print("Current extension is: " + json_object["info"]["savedExtensions"][0]["javascriptURL"])
print("Going to replace with: " + new_extension)
json_object["info"]["savedExtensions"][0]["javascriptURL"] = new_extension
zf.close()
print("Rebuilding project file with new extension...")
zin = zipfile.ZipFile (file_path, 'r')
zout = zipfile.ZipFile (file_path + ".temp", 'w')
for item in zin.infolist():
    buffer = zin.read(item.filename)
    if item.filename == project_json:
        print("-> Injecting extension into config: " + item.filename)
        zout.writestr(item, json.dumps(json_object))
    else:
        zout.writestr(item, buffer)
    print("-> Built: " + item.filename)
zout.close()
zin.close()
print("Project rebuilt")
print("Cleaning up...")
os.remove(file_path)
os.rename(file_path + ".temp", file_path)
print("Finished")
