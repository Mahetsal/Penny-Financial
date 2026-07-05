@echo off
echo ==========================================================
echo   Tharaa AI (ثراء) - Android Local Build Helper
echo ==========================================================
echo.
echo Requirements:
echo 1. Java JDK 17 installed (with JAVA_HOME pointing to your JDK folder)
echo 2. Android SDK installed (with ANDROID_HOME pointing to AppData\Local\Android\Sdk)
echo.
set /p proceed="Do you want to compile now? (y/n): "
if /i "%proceed%" neq "y" exit /b

echo.
echo [Step 1/3] Building React Frontend...
cd frontend
call npm run build
if %errorlevel% neq 0 (
  echo Error: Frontend build failed.
  pause
  exit /b
)
cd ..

echo.
echo [Step 2/3] Syncing Capacitor Assets...
call npx cap sync
if %errorlevel% neq 0 (
  echo Error: Capacitor sync failed.
  pause
  exit /b
)

echo.
echo [Step 3/3] Compiling Native Android Project...
cd android
call gradlew.bat assembleDebug
if %errorlevel% neq 0 (
  echo Error: Android compilation failed. Make sure JDK 17 and Android SDK are installed and configured.
  cd ..
  pause
  exit /b
)
cd ..

echo.
echo ==========================================================
echo   SUCCESS! Your APK is ready at:
echo   android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================================
pause
