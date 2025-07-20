const express = require('express');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

// 设置ffmpeg和ffprobe路径
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务
app.use(express.static(path.join(__dirname, 'dist')));

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'server', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传视频文件'), false);
    }
  },
  limits: {
    fileSize: 500 * 1024 * 1024 // 500MB限制
  }
});

// 导入后端服务器的所有函数
const serverPath = path.join(__dirname, 'server', 'server.js');
const serverModule = require(serverPath);

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '服务器运行正常' });
});

// API密钥验证端点
app.get('/api/test-apis', async (req, res) => {
  try {
    console.log('测试API连接...');
    
    const results = {};
    
    // 测试百度AI
    try {
      console.log('测试百度AI连接...');
      const accessToken = await serverModule.getBaiduAccessToken();
      results.baidu = { status: 'success', message: '百度AI连接正常' };
    } catch (error) {
      results.baidu = { status: 'error', message: error.message };
    }
    
    // 测试腾讯云翻译
    try {
      console.log('测试腾讯云翻译连接...');
      const response = await axios.post('https://tmt.tencentcloudapi.com/', {
        SourceText: 'Hello',
        Source: 'en',
        Target: 'zh',
        ProjectId: 0
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      results.tencent = { status: 'success', message: '腾讯云翻译连接正常' };
    } catch (error) {
      results.tencent = { status: 'error', message: error.message };
    }
    
    res.json({ 
      status: 'completed', 
      results: results
    });
  } catch (error) {
    console.error('API测试失败:', error.message);
    res.status(500).json({ 
      status: 'error', 
      message: error.message
    });
  }
});

// 处理视频上传和字幕提取
app.post('/api/process-video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const videoPath = req.file.path;
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const targetLanguage = req.body.targetLanguage || 'zh';
    
    console.log('处理视频:', videoPath);
    console.log('目标语言:', targetLanguage);

    // 1. 提取音频
    const audioPath = path.join(__dirname, 'server', 'uploads', `${videoName}.wav`);
    await serverModule.extractAudio(videoPath, audioPath);

    // 2. 检查是否有内置字幕
    const hasSubtitles = await serverModule.checkForSubtitles(videoPath);
    
    let subtitles = '';
    let translatedSubtitles = '';
    let detectedLanguage = null;

    if (hasSubtitles) {
      // 提取内置字幕
      subtitles = await serverModule.extractSubtitles(videoPath);
    } else {
      // 使用语音识别生成字幕
      subtitles = await serverModule.generateSubtitlesFromAudio(audioPath);
    }

    // 3. 检测语言并翻译字幕
    if (subtitles) {
      detectedLanguage = await serverModule.detectLanguage(subtitles);
      console.log('检测到的语言:', detectedLanguage);
      
      if (detectedLanguage && detectedLanguage !== targetLanguage) {
        translatedSubtitles = await serverModule.translateSubtitles(subtitles, detectedLanguage, targetLanguage);
      } else {
        translatedSubtitles = subtitles; // 如果语言相同，不翻译
      }
    }

    // 4. 生成带字幕的视频
    let videoWithSubtitles = null;
    if (translatedSubtitles) {
      videoWithSubtitles = await serverModule.generateVideoWithSubtitles(videoPath, translatedSubtitles);
    }

    // 清理临时文件
    serverModule.cleanupFiles([audioPath]);

    res.json({
      subtitles: subtitles,
      translatedSubtitles: translatedSubtitles,
      hasSubtitles: hasSubtitles,
      videoWithSubtitles: videoWithSubtitles,
      detectedLanguage: detectedLanguage,
      debug: {
        audioExtracted: true,
        speechRecognitionUsed: !hasSubtitles,
        translationUsed: true
      }
    });

  } catch (error) {
    console.error('处理视频时出错:', error);
    res.status(500).json({ error: error.message });
  }
});

// 视频文件服务端点
app.get('/api/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, 'server', 'uploads', filename);
  
  if (fs.existsSync(videoPath)) {
    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } else {
    res.status(404).json({ error: '视频文件不存在' });
  }
});

// 所有其他请求返回前端应用
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 生产服务器运行在端口 ${PORT}`);
}); 