!include "MUI2.nsh"
!include "FileFunc.nsh"
!include LogicLib.nsh

; Define application name and version
!define APPNAME "Order Management"
!define COMPANYNAME "Thanh Que"
!define DESCRIPTION "Order Management Software"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0

; General
Name "${APPNAME}"
OutFile "QuanLyDonHang_Setup.exe"
InstallDir "$PROGRAMFILES\${APPNAME}"
InstallDirRegKey HKCU "Software\${APPNAME}" ""

; Request admin privileges
RequestExecutionLevel admin

; Interface Settings
!define MUI_ABORTWARNING
!define MUI_ICON "${NSISDIR}\Contrib\Graphics\Icons\modern-install.ico"
!define MUI_UNICON "${NSISDIR}\Contrib\Graphics\Icons\modern-uninstall.ico"

; Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "README.md"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES

; Languages
!insertmacro MUI_LANGUAGE "English"

; Installation Section
Section "MainSection" SEC01
    SetOutPath "$INSTDIR"
    
    ; Add files to install
    File /r "dist\QuanLyDonHang\*.*"
    File "requirements.txt"
    File "README.md"
    
    ; Create application data directory
    CreateDirectory "$APPDATA\QuanLyDonHang"
    CreateDirectory "$APPDATA\QuanLyDonHang\logs"
    SetOutPath "$APPDATA\QuanLyDonHang\logs"
    
    ; Create desktop shortcut
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\QuanLyDonHang.exe"
    
    ; Create start menu shortcut
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\QuanLyDonHang.exe"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
    
    ; Install dependencies
    nsExec::ExecToLog '"$R0\python.exe" -m pip install --upgrade pip'
    nsExec::ExecToLog '"$R0\python.exe" -m pip install -r "$INSTDIR\requirements.txt"'
    
    ; Write uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    ; Write registry keys
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\assets\icon.ico"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${COMPANYNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
SectionEnd

; Uninstallation Section
Section "Uninstall"
    ; Remove installed files
    RMDir /r "$INSTDIR\*.*"
    RMDir "$INSTDIR"
    
    ; Remove AppData directory
    RMDir /r "$APPDATA\QuanLyDonHang"
    
    ; Remove shortcuts
    Delete "$DESKTOP\${APPNAME}.lnk"
    RMDir /r "$SMPROGRAMS\${APPNAME}"
    
    ; Remove registry keys
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
    DeleteRegKey HKCU "Software\${APPNAME}"
SectionEnd