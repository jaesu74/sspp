@echo off
echo [FILE VERIFY] Checking file: %1
echo.

if not exist %1 (
    echo [FILE VERIFY] ERROR: File does not exist!
    exit /b 1
)

echo [FILE VERIFY] File size:
dir %1 | findstr /C:"File(s)"

echo.
echo [FILE VERIFY] First 5 lines:
powershell -Command "Get-Content -Path '%1' -TotalCount 5"

echo.
echo [FILE VERIFY] Last 5 lines:
powershell -Command "Get-Content -Path '%1' | Select-Object -Last 5"

echo.
echo [FILE VERIFY] Encoding check:
powershell -Command "[System.IO.File]::ReadAllText('%1').Substring(0, [Math]::Min(50, (Get-Item '%1').Length)) | ForEach-Object { [int][char]$_ }" | findstr /B /C:"63 13 10"
if %ERRORLEVEL% EQU 0 (
    echo [FILE VERIFY] WARNING: File might have encoding issues!
) else (
    echo [FILE VERIFY] Encoding appears normal.
)

echo.
echo [FILE VERIFY] Verification complete.