@echo off
echo 🚀 开始部署到 Railway...

REM 检查是否安装了 Railway CLI
railway --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Railway CLI 未安装
    echo 请先安装 Railway CLI:
    echo npm install -g @railway/cli
    pause
    exit /b 1
)

REM 检查是否已登录
railway whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo 请先登录 Railway:
    echo railway login
    pause
    exit /b 1
)

REM 检查环境变量
echo 📋 检查环境变量...
if "%BAIDU_APP_ID%"=="" (
    echo ❌ 缺少百度AI环境变量
    echo 请设置以下环境变量:
    echo set BAIDU_APP_ID=您的百度AI应用ID
    echo set BAIDU_API_KEY=您的百度AI API密钥
    echo set BAIDU_SECRET_KEY=您的百度AI密钥
    pause
    exit /b 1
)

if "%TENCENT_SECRET_ID%"=="" (
    echo ❌ 缺少腾讯云环境变量
    echo 请设置以下环境变量:
    echo set TENCENT_SECRET_ID=您的腾讯云密钥ID
    echo set TENCENT_SECRET_KEY=您的腾讯云密钥
    pause
    exit /b 1
)

echo ✅ 环境变量检查通过

REM 构建项目
echo 🔨 构建项目...
call npm run build
if %errorlevel% neq 0 (
    echo ❌ 构建失败
    pause
    exit /b 1
)

echo ✅ 构建完成

REM 部署到 Railway
echo 🚀 部署到 Railway...
railway up
if %errorlevel% equ 0 (
    echo ✅ 部署成功！
    echo 🌐 您的应用已部署到 Railway
    echo 📱 访问地址: https://your-app-name.railway.app
) else (
    echo ❌ 部署失败
    pause
    exit /b 1
)

pause 