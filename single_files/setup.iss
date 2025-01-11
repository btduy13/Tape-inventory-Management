[Setup]
AppName=Tape Inventory Management
AppVersion=1.0
DefaultDirName={pf}\TapeInventoryManagement
DefaultGroupName=Tape Inventory Management
OutputDir=Output
OutputBaseFilename=TapeInventoryManagement_Setup
Compression=lzma
SolidCompression=yes
SetupIconFile=C:\Users\PC\Documents\scr\assets\app_icon.ico
PrivilegesRequired=admin

[Dirs]
Name: "{app}"; Permissions: everyone-full

[Files]
; Copy entire directory instead of single exe
Source: "C:\Users\PC\Documents\scr\dist\TapeInventoryManagement\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Tape Inventory Management"; Filename: "{app}\TapeInventoryManagement.exe"
Name: "{commondesktop}\Tape Inventory Management"; Filename: "{app}\TapeInventoryManagement.exe"

[Run]
Filename: "{app}\TapeInventoryManagement.exe"; Description: "Launch application"; Flags: postinstall nowait