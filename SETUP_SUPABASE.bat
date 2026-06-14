@echo off
title Manner — Supabase Setup
color 0B
echo.
echo  ============================================================
echo    MANNER — Supabase Database Setup
echo  ============================================================
echo.
echo  Your Supabase credentials are already saved in .env
echo.
echo  STEP 1: Open this URL in your browser:
echo.
echo    https://supabase.com/dashboard/project/qrhfasizkcrkckvpycts/sql/new
echo.
echo  STEP 2: Copy and paste the contents of this file:
echo.
echo    backend\db\schema.sql
echo.
echo  STEP 3: Click the green "Run" button in Supabase
echo.
echo  STEP 4: Come back here and press any key to seed data
echo.
pause
echo.
echo  Seeding products and admin account...
cmd /c "cd backend && node db/seed.js"
echo.
echo  ============================================================
echo  DONE! Now start your server:
echo    Double-click START_SERVER.bat
echo  ============================================================
echo.
pause
