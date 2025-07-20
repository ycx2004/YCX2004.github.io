# 视频字幕翻译器

一个基于Web的视频字幕翻译应用，支持自动语音识别和字幕翻译。

## 功能特性

- 🎥 支持拖拽上传MP4、AVI、MOV、MKV等视频格式
- 🔍 自动检测视频是否包含内置字幕
- 🎤 对于无字幕视频，使用百度AI进行语音识别
- 🌐 自动翻译字幕为中文
- 💾 支持下载原始字幕和翻译后字幕
- 📱 响应式设计，支持移动端使用

## 技术栈

### 前端
- React 18
- Vite
- React Dropzone
- Lucide React (图标)

### 后端
- Node.js
- Express
- Multer (文件上传)
- FFmpeg (视频处理)
- 百度AI API (语音识别)
- 腾讯云翻译 API (字幕翻译)

## 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd video-subtitle-translator
```

### 2. 安装依赖

```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
```

### 3. 配置环境变量

在 `server` 目录下创建 `.env` 文件：

```bash
cp server/env.example server/.env
```

编辑 `.env` 文件，添加百度AI和腾讯云的API密钥：

```
# 百度AI配置
BAIDU_APP_ID=your_baidu_app_id_here
BAIDU_API_KEY=your_baidu_api_key_here
BAIDU_SECRET_KEY=your_baidu_secret_key_here

# 腾讯云翻译配置
TENCENT_SECRET_ID=your_tencent_secret_id_here
TENCENT_SECRET_KEY=your_tencent_secret_key_here

# 服务器端口
PORT=3001
```

**获取API密钥的方法：**
- 百度AI：访问 https://ai.baidu.com/ 注册并创建应用
- 腾讯云翻译：访问 https://cloud.tencent.com/ 开通机器翻译服务

详细配置说明请参考 `API_SETUP.md` 文件。

### 4. 启动开发服务器

```bash
# 启动开发环境（同时启动前后端）
npm start

# 或者分别启动
# 启动后端服务器
cd server
npm run dev

# 在另一个终端启动前端服务器
npm run dev
```

访问 http://localhost:3000 即可使用应用。

## 部署到云端

### 🚀 Railway (推荐)

Railway 是最适合视频处理应用的平台，支持 FFmpeg 和 Node.js。

#### 快速部署：

1. **使用部署脚本（推荐）**：
   ```bash
   # Linux/Mac
   chmod +x deploy-railway.sh
   ./deploy-railway.sh
   
   # Windows
   deploy-railway.bat
   ```

2. **手动部署**：
   - 注册 [Railway](https://railway.app/) 账号
   - 连接 GitHub 仓库
   - 创建新项目，选择您的仓库
   - 在环境变量中添加 API 密钥配置
   - 部署会自动开始

#### 环境变量配置：
```
BAIDU_APP_ID=您的百度AI应用ID
BAIDU_API_KEY=您的百度AI API密钥
BAIDU_SECRET_KEY=您的百度AI密钥
TENCENT_SECRET_ID=您的腾讯云密钥ID
TENCENT_SECRET_KEY=您的腾讯云密钥
```

### 🌐 其他平台

#### Render
1. 注册 [Render](https://render.com/) 账号
2. 连接 GitHub 仓库
3. 创建新的 Web Service
4. 配置：
   - **Build Command**: `npm install && cd server && npm install && npm run build`
   - **Start Command**: `npm run start:prod`
5. 添加环境变量并部署

#### DigitalOcean App Platform
1. 注册 DigitalOcean 账号
2. 在 App Platform 中创建新应用
3. 连接 GitHub 仓库
4. 配置构建和启动命令
5. 添加环境变量并部署

#### Heroku
1. 注册 Heroku 账号
2. 安装 Heroku CLI
3. 创建应用：`heroku create your-app-name`
4. 添加环境变量并部署

详细部署指南请参考 `DEPLOYMENT.md` 文件。

## 生产环境测试

在部署前，建议先在本地测试生产环境：

```bash
# 构建前端
npm run build

# 启动生产服务器
npm run start:prod
```

## API接口

### POST /api/process-video

处理视频文件并返回字幕信息。

**请求参数：**
- `video`: 视频文件 (multipart/form-data)
- `targetLanguage`: 目标语言 (可选，默认为 'zh')

**响应：**
```json
{
  "subtitles": "原始字幕内容",
  "translatedSubtitles": "翻译后字幕内容",
  "hasSubtitles": true,
  "detectedLanguage": "en",
  "videoWithSubtitles": "processed_video.mp4"
}
```

### GET /api/health

健康检查接口。

### GET /api/test-apis

测试 API 连接状态。

## 使用说明

1. 打开网页应用
2. 拖拽视频文件到上传区域，或点击选择文件
3. 选择目标语言（可选）
4. 点击"开始处理"按钮
5. 等待处理完成（可能需要几分钟，取决于视频长度）
6. 查看原始字幕和翻译后字幕
7. 点击下载按钮保存字幕文件

## 性能优化

- 视频文件大小限制为 500MB
- 音频处理限制为 60 秒进行语音识别
- 自动清理临时文件
- 多层错误处理和备用方案

## 注意事项

- 视频文件大小限制为500MB
- 支持的视频格式：MP4、AVI、MOV、MKV
- 需要有效的百度AI和腾讯云API密钥
- 处理时间取决于视频长度和网络状况
- 建议使用较小的视频文件进行测试

## 故障排除

常见问题请参考 `DEPLOYMENT.md` 文件中的故障排除部分。

## 贡献

欢迎提交Issue和Pull Request！

## 许可证

MIT License 