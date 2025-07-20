# 视频字幕翻译器部署指南

## 支持的部署平台

### 1. Railway (推荐)
Railway 是一个现代化的云平台，支持 Node.js 和 FFmpeg，非常适合视频处理应用。

#### 部署步骤：
1. 注册 [Railway](https://railway.app/) 账号
2. 连接您的 GitHub 仓库
3. 创建新项目，选择您的仓库
4. 在环境变量中添加以下配置：
   ```
   BAIDU_APP_ID=您的百度AI应用ID
   BAIDU_API_KEY=您的百度AI API密钥
   BAIDU_SECRET_KEY=您的百度AI密钥
   TENCENT_SECRET_ID=您的腾讯云密钥ID
   TENCENT_SECRET_KEY=您的腾讯云密钥
   ```
5. 部署会自动开始，Railway 会使用 `nixpacks.toml` 配置

### 2. Render
Render 提供免费套餐，支持 Node.js 应用。

#### 部署步骤：
1. 注册 [Render](https://render.com/) 账号
2. 连接 GitHub 仓库
3. 创建新的 Web Service
4. 配置：
   - **Build Command**: `npm install && cd server && npm install && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Environment**: Node.js
5. 添加环境变量（同 Railway）
6. 部署

### 3. DigitalOcean App Platform
DigitalOcean 提供强大的应用平台。

#### 部署步骤：
1. 注册 DigitalOcean 账号
2. 在 App Platform 中创建新应用
3. 连接 GitHub 仓库
4. 配置：
   - **Source Directory**: `/`
   - **Build Command**: `npm install && cd server && npm install && npm run build`
   - **Run Command**: `npm run start:prod`
5. 添加环境变量
6. 部署

### 4. Heroku
Heroku 是经典选择，但需要信用卡验证。

#### 部署步骤：
1. 注册 Heroku 账号
2. 安装 Heroku CLI
3. 创建应用：`heroku create your-app-name`
4. 添加环境变量：
   ```bash
   heroku config:set BAIDU_APP_ID=您的百度AI应用ID
   heroku config:set BAIDU_API_KEY=您的百度AI API密钥
   heroku config:set BAIDU_SECRET_KEY=您的百度AI密钥
   heroku config:set TENCENT_SECRET_ID=您的腾讯云密钥ID
   heroku config:set TENCENT_SECRET_KEY=您的腾讯云密钥
   ```
5. 部署：`git push heroku main`

## 环境变量配置

所有平台都需要配置以下环境变量：

```bash
# 百度AI配置
BAIDU_APP_ID=您的百度AI应用ID
BAIDU_API_KEY=您的百度AI API密钥
BAIDU_SECRET_KEY=您的百度AI密钥

# 腾讯云翻译配置
TENCENT_SECRET_ID=您的腾讯云密钥ID
TENCENT_SECRET_KEY=您的腾讯云密钥
```

## 获取API密钥

### 百度AI
1. 访问 [百度AI开放平台](https://ai.baidu.com/)
2. 注册账号并创建应用
3. 获取 App ID、API Key 和 Secret Key

### 腾讯云翻译
1. 访问 [腾讯云控制台](https://console.cloud.tencent.com/)
2. 开通机器翻译服务
3. 创建 API 密钥

## 本地测试

在部署前，建议先在本地测试：

```bash
# 安装依赖
npm install
cd server && npm install

# 构建前端
npm run build

# 启动生产服务器
npm run start:prod
```

## 故障排除

### 常见问题

1. **FFmpeg 未找到**
   - 确保平台支持 FFmpeg
   - 检查 `nixpacks.toml` 配置

2. **API 密钥错误**
   - 检查环境变量是否正确设置
   - 验证 API 密钥是否有效

3. **文件上传失败**
   - 检查文件大小限制
   - 确保上传目录有写入权限

4. **视频处理超时**
   - 增加平台超时设置
   - 考虑使用更小的视频文件测试

### 日志查看

- **Railway**: 在项目仪表板中查看日志
- **Render**: 在服务详情页面查看日志
- **DigitalOcean**: 在应用详情页面查看日志
- **Heroku**: 使用 `heroku logs --tail` 查看日志

## 性能优化

1. **视频文件大小限制**: 当前设置为 500MB
2. **音频处理**: 限制为 60 秒音频进行语音识别
3. **文件清理**: 自动清理临时文件
4. **错误处理**: 包含多层备用方案

## 安全注意事项

1. 不要在代码中硬编码 API 密钥
2. 使用环境变量存储敏感信息
3. 定期轮换 API 密钥
4. 监控 API 使用量以避免超额费用 