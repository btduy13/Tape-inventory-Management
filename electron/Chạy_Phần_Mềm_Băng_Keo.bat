@echo off
title Khoi Chay Phan Mem Quan Ly Don Hang Bang Keo
chcp 65001 > nul
echo ======================================================================
echo          PHAN MEM QUAN LY DON HANG BANG KEO (DESKTOP SHELL)
echo ======================================================================
echo.

rem Di chuyen vao thu muc chua file batch nay
cd /d "%~dp0"

rem Kiem tra neu chua co node_modules, tu dong cai dat
if not exist node_modules (
    echo [THONG BAO] Phat heyn day la lan khoi chay dau tien cua ban.
    echo He thong dang tu dong tai va cai dat thu vien Desktop Electron va pg...
    echo Vui long giu ket noi Internet. Qua trinh nay co the mat 1-2 phut...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [LOI CAI DAT] Khong the tai thu vien Electron va PostgreSQL.
        echo Vui long kiem tra lai ket noi mang va chay lai tep nay!
        echo.
        pause
        exit /b
    )
    echo.
    echo [THANH CONG] Da tai xong thu vien can thiet!
    echo.
)

echo Dang khoi dong cua so ung dung Quan ly Bang Keo...
echo Vui long khong dong cua so dong lenh nay cho den khi ket thuc lam viec.
echo.
call npm start
