@echo off
chcp 65001 > nul
title Synchronisation du Catalogue Comics & BD
cd /d "%~dp0"
echo ===============================================================
echo 🚀 LANCEMENT DE LA SYNCHRONISATION DU CATALOGUE (Excalibur & BnF)
echo ===============================================================
node sync_catalog.js
echo.
pause
