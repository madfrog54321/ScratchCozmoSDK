import zipfile
import os
import json

filepath = "C:\\Users\\konno\\Documents\\GitKraken\\ScratchCozmoSDK\\demo.sprite2"
imagepath = 'images/'

if not os.path.exists(imagepath):
    os.makedirs(imagepath)
for the_file in os.listdir(imagepath):
    file_path = os.path.join(imagepath, the_file)
    try:
        if os.path.isfile(file_path):
            os.unlink(file_path)
    except Exception as e:
        print(e)


zf = zipfile.ZipFile(filepath, 'r')
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
displaySprite = []
for costume in sprite['costumes']:
    displaySprite.append({
        'name': costume['costumeName'],
        'filePath': imagepath + spriteName + str(costume['baseLayerID']) + '.png'
    })
    #print('Name: ' + costume['costumeName'])
    #print('File Path: ' + imagepath + spriteName + str(costume['baseLayerID']) + '.png')

for costume in displaySprite:
    print('[' + costume['name'] + '] ' + costume['filePath'])
