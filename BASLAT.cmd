@echo off
cd /d "%~dp0"
set "wimNode=node"
where node >nul 2>nul
if errorlevel 1 (
 if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" (
  set "wimNode=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
 ) else (
  echo Bu bilgisayarda Node.js bulunamadi. Node.js 22 veya ustunu kurun.
  pause
  exit /b 1
 )
)
"%wimNode%" build.mjs
if errorlevel 1 (
 pause
 exit /b 1
)
"%wimNode%" server.mjs
pause
