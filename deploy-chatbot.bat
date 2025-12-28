@echo off
echo ========================================
echo Deploying chatbot-streaming to Supabase
echo ========================================
echo.

cd /d "%~dp0"

echo Step 1: Logging into Supabase...
call npx supabase login

echo.
echo Step 2: Deploying chatbot-streaming function...
call npx supabase functions deploy chatbot-streaming --project-ref rcjlaybjnozqbsoxzboa

echo.
echo ========================================
echo Deployment complete!
echo ========================================
echo.
echo Next steps:
echo 1. Wait 30 seconds
echo 2. Go to https://creatives-takeover.com
echo 3. Hard refresh (Ctrl+Shift+R)
echo 4. Test the chat
echo.
pause
