#!/bin/bash

echo "🚀 开始部署到 Railwaystation..."

# 检查是否安装了 Railway CLI
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI 未安装"
    echo "请先安装 Railway CLI:"
    echo "npm install -g @railway/cli"
    exit 1
fi

# 检查是否已登录
if ! railway whoami &> /dev/null; then
    echo "请先登录 Railway:"
    echo "railway login"
    exit 1
fi

# 检查环境变量
echo "📋 检查环境变量..."
if [ -z "$BAIDU_APP_ID" ] || [ -z "$BAIDU_API_KEY" ] || [ -z "$BAIDU_SECRET_KEY" ]; then
    echo "❌ 缺少百度AI环境变量"
    echo "请设置以下环境变量:"
    echo "export BAIDU_APP_ID=您的百度AI应用ID"
    echo "export BAIDU_API_KEY=您的百度AI API密钥"
    echo "export BAIDU_SECRET_KEY=您的百度AI密钥"
    exit 1
fi

if [ -z "$TENCENT_SECRET_ID" ] || [ -z "$TENCENT_SECRET_KEY" ]; then
    echo "❌ 缺少腾讯云环境变量"
    echo "请设置以下环境变量:"
    echo "export TENCENT_SECRET_ID=您的腾讯云密钥ID"
    echo "export TENCENT_SECRET_KEY=您的腾讯云密钥"
    exit 1
fi

echo "✅ 环境变量检查通过"

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建完成"

# 部署到 Railway
echo "🚀 部署到 Railway..."
railway up

if [ $? -eq 0 ]; then
    echo "✅ 部署成功！"
    echo "🌐 您的应用已部署到 Railway"
    echo "📱 访问地址: https://your-app-name.railway.app"
else
    echo "❌ 部署失败"
    exit 1
fi 