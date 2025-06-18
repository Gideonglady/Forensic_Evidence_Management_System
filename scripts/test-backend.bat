@echo off
echo Testing Photo Evidence Backend...
echo.

echo Current IP Address:
ipconfig | findstr "IPv4"
echo.

echo Testing localhost:8000...
curl http://localhost:8000/
echo.

echo Testing 192.168.253.55:8000...
curl http://192.168.253.55:8000/
echo.

echo Backend test complete.
pause 