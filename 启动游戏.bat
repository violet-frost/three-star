@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  start "" "%~dp0index.html"
  echo 已在浏览器打开离线游戏。手机局域网访问需要安装 Node.js 后再运行此脚本。
  pause
  exit /b
)
node tools\serve.cjs --open
pause
