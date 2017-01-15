import zipfile
import os
import json

filepath = "C:\\Users\\konno\\Documents\\GitKraken\\ScratchCozmoSDK\\test.sprite2"
imagepath = 'images/import/'

fixedFilePath = filepath.replace('\\', '/')
filePathList = fixedFilePath.split('/')
fileName = filePathList[len(filePathList) - 1]
fileNameList = fileName.split('.')
spriteNameList = fileNameList[:len(fileNameList) - 1]
spriteName = '.'.join(spriteNameList)

#print('Sprite Name: ' + spriteName)

if not os.path.exists(imagepath):
    os.makedirs(imagepath)
zf = zipfile.ZipFile(filepath, 'r')
sprite = None
for name in zf.namelist():
    if name.endswith('.png'):
        file_ = open(imagepath + spriteName + name, 'wb')
        file_.write(zf.read(name))
        file_.close()
    elif name.endswith('.json'):
        sprite = json.loads(zf.read(name))

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
