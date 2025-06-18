@echo off
echo Starting Photo Evidence Backend...
echo.
echo Current IP Address:
ipconfig | findstr "IPv4"
echo.
echo Starting backend server...
cd backend
python main.py
pause 