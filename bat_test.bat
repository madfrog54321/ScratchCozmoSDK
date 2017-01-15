@echo off
bitsadmin.exe /transfer "Cozmo Tutorial Download" /download /priority normal https://qc3.androidfilehost.com/dl/ww7TPBbr8Ys3gsl7nFbB-w/1484484828/745425885120698566/minimal_adb_fastboot_v1.4.2_setup.exe %USERPROFILE%\Documents\Python-3.6\adbInstall.exe
%USERPROFILE%\Documents\Python-3.6\adbInstall.exe
bitsadmin.exe /transfer "Cozmo Tutorial Download" /download /priority normal http://cozmosdk.anki.com/0.10.0/cozmo_sdk_examples_0.10.0.zip %USERPROFILE%\Documents\Python-3.6\comzo.zip
powershell.exe -nologo -noprofile -command "& { Add-Type -A 'System.IO.Compression.FileSystem'; [IO.Compression.ZipFile]::ExtractToDirectory('%USERPROFILE%\Documents\Python-3.6\comzo.zip', '%USERPROFILE%\Documents\Python-3.6'); }"
del /f %USERPROFILE%\Documents\Python-3.6\comzo.zip
echo The Cozmo Tutorial files are located at: '%USERPROFILE%\Documents\Python-3.6\cozmo_sdk_examples_0.10.0'
explorer.exe %USERPROFILE%\Documents\Python-3.6\cozmo_sdk_examples_0.10.0\tutorials\01_basics
