@echo off
echo [VERIFY] Running command: %*
echo.

%*

echo.
echo [VERIFY] Command completed with exit code: %ERRORLEVEL%
echo [VERIFY] Current Git status:
git status

echo.
echo [VERIFY] Last commit:
git log -1 --oneline

echo.
echo [VERIFY] Remote status:
git remote -v