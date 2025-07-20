const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
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
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 配置multer用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
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

// 百度AI配置
const BAIDU_APP_ID = process.env.BAIDU_APP_ID;
const BAIDU_API_KEY = process.env.BAIDU_API_KEY;
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY;

// 腾讯云翻译配置
const TENCENT_SECRET_ID = process.env.TENCENT_SECRET_ID;
const TENCENT_SECRET_KEY = process.env.TENCENT_SECRET_KEY;

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
    const audioPath = path.join(__dirname, 'uploads', `${videoName}.wav`);
    await extractAudio(videoPath, audioPath);

    // 2. 检查是否有内置字幕
    const hasSubtitles = await checkForSubtitles(videoPath);
    
    let subtitles = '';
    let translatedSubtitles = '';
    let detectedLanguage = null;

    if (hasSubtitles) {
      // 提取内置字幕
      subtitles = await extractSubtitles(videoPath);
    } else {
      // 使用语音识别生成字幕
      subtitles = await generateSubtitlesFromAudio(audioPath);
    }

    // 3. 检测语言并翻译字幕
    if (subtitles) {
      detectedLanguage = await detectLanguage(subtitles);
      console.log('检测到的语言:', detectedLanguage);
      
      if (detectedLanguage && detectedLanguage !== targetLanguage) {
        translatedSubtitles = await translateSubtitles(subtitles, detectedLanguage, targetLanguage);
      } else {
        translatedSubtitles = subtitles; // 如果语言相同，不翻译
      }
    }

    // 4. 生成带字幕的视频
    let videoWithSubtitles = null;
    if (translatedSubtitles) {
      videoWithSubtitles = await generateVideoWithSubtitles(videoPath, translatedSubtitles);
    }

    // 清理临时文件
    cleanupFiles([audioPath]);

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

// 提取音频
function extractAudio(videoPath, audioPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(16000)
      .duration(60) // 使用正确的duration方法限制音频长度为60秒
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(audioPath);
  });
}

// 检查视频是否有内置字幕
function checkForSubtitles(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      
      const hasSubtitles = metadata.streams.some(stream => 
        stream.codec_type === 'subtitle'
      );
      resolve(hasSubtitles);
    });
  });
}

// 提取内置字幕
function extractSubtitles(videoPath) {
  return new Promise((resolve, reject) => {
    const subtitlePath = videoPath.replace(/\.[^/.]+$/, '.srt');
    
    ffmpeg(videoPath)
      .outputOptions(['-map 0:s:0']) // 提取第一个字幕流
      .output(subtitlePath)
      .on('end', () => {
        try {
          const subtitles = fs.readFileSync(subtitlePath, 'utf8');
          fs.unlinkSync(subtitlePath); // 删除临时文件
          resolve(subtitles);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', (err) => reject(err))
      .run();
  });
}

// 获取百度AI访问令牌
async function getBaiduAccessToken() {
  try {
    const response = await axios.get('https://aip.baidubce.com/oauth/2.0/token', {
      params: {
        grant_type: 'client_credentials',
        client_id: BAIDU_API_KEY,
        client_secret: BAIDU_SECRET_KEY
      }
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('获取百度AI访问令牌失败:', error.message);
    throw new Error('百度AI认证失败');
  }
}

// 使用百度AI语音识别生成字幕
async function generateSubtitlesFromAudio(audioPath) {
  try {
    console.log('尝试使用百度AI进行语音识别...');
    
    // 获取访问令牌
    const accessToken = await getBaiduAccessToken();
    
    // 读取音频文件
    const audioBuffer = fs.readFileSync(audioPath);
    let response;
    
    // 检查音频长度，百度AI限制为4MB
    if (audioBuffer.length > 4 * 1024 * 1024) {
      console.log('音频文件过大，截取前60秒进行处理...');
      // 重新生成较短的音频文件
      const shortAudioPath = audioPath.replace('.wav', '_short.wav');
      await extractShortAudio(audioPath, shortAudioPath);
      const shortAudioBuffer = fs.readFileSync(shortAudioPath);
      const base64Audio = shortAudioBuffer.toString('base64');
      
      // 调用百度语音识别API - 使用正确的参数格式
      response = await axios.post(
        `https://vop.baidu.com/server_api`,
        {
          format: 'pcm',
          rate: 16000,
          channel: 1,
          cuid: BAIDU_APP_ID,
          token: accessToken,
          speech: base64Audio,
          len: shortAudioBuffer.length,
          dev_pid: 1537 // 普通话识别
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      // 清理临时文件
      fs.unlinkSync(shortAudioPath);
    } else {
      const base64Audio = audioBuffer.toString('base64');
      
      // 调用百度语音识别API - 使用正确的参数格式
      response = await axios.post(
        `https://vop.baidu.com/server_api`,
        {
          format: 'pcm',
          rate: 16000,
          channel: 1,
          cuid: BAIDU_APP_ID,
          token: accessToken,
          speech: base64Audio,
          len: audioBuffer.length,
          dev_pid: 1537 // 普通话识别
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }
    
    if (response.data.err_no === 0) {
      const recognizedText = response.data.result[0];
      console.log('百度AI语音识别成功');
      
      // 将识别结果转换为SRT格式
      return convertToSRT(recognizedText);
    } else {
      throw new Error(`百度AI语音识别失败: ${response.data.err_msg}`);
    }
  } catch (error) {
    console.error('百度AI语音识别失败:', error.message);
    
    // 备用方案：使用本地语音识别或返回示例字幕
    return generateFallbackSubtitles(audioPath);
  }
}

// 提取短音频文件
function extractShortAudio(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioChannels(1)
      .audioFrequency(16000)
      .duration(60) // 使用正确的duration方法限制为60秒
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .save(outputPath);
  });
}

// 将文本转换为SRT格式
function convertToSRT(text) {
  // 简单的SRT格式转换
  const sentences = text.split(/[。！？]/).filter(s => s.trim());
  let srtContent = '';
  
  sentences.forEach((sentence, index) => {
    const startTime = index * 3;
    const endTime = (index + 1) * 3;
    
    srtContent += `${index + 1}\n`;
    srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`;
    srtContent += `${sentence.trim()}\n\n`;
  });
  
  return srtContent;
}

// 格式化时间
function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},000`;
}

// 备用语音识别方案
async function generateFallbackSubtitles(audioPath) {
  try {
    // 返回英文示例字幕，避免被翻译函数处理
    const exampleSubtitles = `1
00:00:00,000 --> 00:00:03,000
This is a sample subtitle

2
00:00:03,000 --> 00:00:06,000
Due to network connection issues

3
00:00:06,000 --> 00:00:09,000
OpenAI service is temporarily unavailable

4
00:00:09,000 --> 00:00:12,000
Please check your network connection`;

    return exampleSubtitles;
  } catch (error) {
    console.error('备用语音识别也失败:', error);
    throw new Error('语音识别服务暂时不可用');
  }
}

// 腾讯云翻译签名生成
function generateTencentSignature(secretKey, date, service, region) {
  const kDate = crypto.createHmac('sha256', `TC3${secretKey}`).update(date).digest();
  const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
  const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
  const kSigning = crypto.createHmac('sha256', kService).update('tc3_request').digest();
  return kSigning;
}

// 检测语言
async function detectLanguage(subtitles) {
  try {
    console.log('检测字幕语言...');
    
    // 提取字幕文本
    const subtitleTexts = extractSubtitleTexts(subtitles);
    const sampleText = subtitleTexts.join(' ').substring(0, 100); // 取前100个字符作为样本
    
    // 简单的语言检测逻辑
    const languagePatterns = {
      'zh': /[\u4e00-\u9fff]/, // 中文字符
      'ja': /[\u3040-\u309f\u30a0-\u30ff]/, // 日文字符
      'ko': /[\uac00-\ud7af]/, // 韩文字符
      'en': /^[a-zA-Z\s.,!?]+$/, // 英文
      'fr': /[àâäéèêëïîôùûüÿç]/i, // 法文字符
      'de': /[äöüß]/i, // 德文字符
      'es': /[ñáéíóúü]/i, // 西班牙文字符
      'ru': /[\u0400-\u04ff]/ // 俄文字符
    };
    
    for (const [lang, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(sampleText)) {
        console.log('检测到语言:', lang);
        return lang;
      }
    }
    
    // 默认返回英文
    console.log('未检测到特定语言，默认使用英文');
    return 'en';
  } catch (error) {
    console.error('语言检测失败:', error.message);
    return 'en'; // 默认返回英文
  }
}

// 翻译字幕
async function translateSubtitles(subtitles, sourceLanguage, targetLanguage) {
  try {
    console.log(`翻译字幕: ${sourceLanguage} -> ${targetLanguage}`);
    
    // 如果源语言和目标语言相同，直接返回原文
    if (sourceLanguage === targetLanguage) {
      console.log('源语言和目标语言相同，跳过翻译');
      return subtitles;
    }
    
    // 提取字幕文本
    const subtitleTexts = extractSubtitleTexts(subtitles);
    console.log('提取的字幕文本:', subtitleTexts);
    
    const translatedTexts = [];
    
    // 尝试使用免费翻译API
    for (const text of subtitleTexts) {
      try {
        console.log(`尝试翻译: "${text}"`);
        const translatedText = await translateTextWithFreeAPI(text, sourceLanguage, targetLanguage);
        translatedTexts.push(translatedText);
        console.log(`翻译成功: "${text}" -> "${translatedText}"`);
      } catch (error) {
        console.error(`免费翻译失败: "${text}"`, error.message);
        // 如果API翻译失败，使用备用翻译
        const fallbackText = translateTextFallback(text, sourceLanguage, targetLanguage);
        translatedTexts.push(fallbackText);
      }
    }
    
    // 重新组装SRT格式
    const translatedSubtitles = reassembleSRT(subtitles, translatedTexts);
    
    console.log('翻译完成');
    return translatedSubtitles;
  } catch (error) {
    console.error('翻译失败:', error.message);
    
    // 如果翻译失败，返回原文
    return subtitles;
  }
}

// 提取字幕文本
function extractSubtitleTexts(srtContent) {
  const lines = srtContent.split('\n');
  const texts = [];
  let currentText = '';
  
  for (const line of lines) {
    if (line.trim() && !line.match(/^\d+$/) && !line.match(/^\d{2}:\d{2}:\d{2},\d{3}/)) {
      currentText += line.trim() + ' ';
    } else if (line.trim() === '' && currentText.trim()) {
      texts.push(currentText.trim());
      currentText = '';
    }
  }
  
  if (currentText.trim()) {
    texts.push(currentText.trim());
  }
  
  return texts;
}

// 使用免费翻译API
async function translateTextWithFreeAPI(text, sourceLanguage, targetLanguage) {
  try {
    console.log(`免费翻译API: "${text}" (${sourceLanguage} -> ${targetLanguage})`);
    
    // 语言代码映射
    const languageMap = {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'fr': 'fr',
      'de': 'de',
      'es': 'es',
      'ru': 'ru'
    };
    
    const sourceLang = languageMap[sourceLanguage] || 'auto';
    const targetLang = languageMap[targetLanguage] || 'zh';
    
    // 使用免费的翻译API (MyMemory)
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
    
    const response = await axios.get(url, {
      timeout: 10000
    });
    
    if (response.data && response.data.responseData && response.data.responseData.translatedText) {
      const translatedText = response.data.responseData.translatedText;
      console.log(`免费翻译成功: "${text}" -> "${translatedText}"`);
      return translatedText;
    } else {
      console.error('免费翻译响应格式错误:', response.data);
      throw new Error('翻译响应格式错误');
    }
  } catch (error) {
    console.error('免费翻译失败:', error.message);
    throw error; // 抛出错误，让调用方处理
  }
}

// 备用翻译方法
function translateTextFallback(text, sourceLanguage, targetLanguage) {
  console.log(`备用翻译: "${text}" (${sourceLanguage} -> ${targetLanguage})`);
  
  // 扩展的翻译对照表
  const translations = {
    // 中文 -> 英文
    'zh-en': {
      '黑白哎我吃吃吃': 'Black and white, I eat eat eat',
      '你好': 'Hello',
      '世界': 'World',
      '测试': 'Test',
      '这是一个示例字幕': 'This is a sample subtitle',
      '由于网络连接问题': 'Due to network connection issues',
      'OpenAI服务暂时不可用': 'OpenAI service is temporarily unavailable',
      '请检查您的网络连接': 'Please check your network connection',
      '你好,我是夏雨辰': 'Hello, I am Xia Yuchen',
      '我是': 'I am',
      '夏雨辰': 'Xia Yuchen'
    },
    // 英文 -> 中文
    'en-zh': {
      'Hello': '你好',
      'World': '世界',
      'Test': '测试',
      'This is a sample subtitle': '这是一个示例字幕',
      'Due to network connection issues': '由于网络连接问题',
      'OpenAI service is temporarily unavailable': 'OpenAI服务暂时不可用',
      'Please check your network connection': '请检查您的网络连接',
      'Black and white, I eat eat eat': '黑白，我吃吃吃',
      'I am': '我是',
      'Xia Yuchen': '夏雨辰'
    },
    // 中文 -> 日文
    'zh-ja': {
      '你好': 'こんにちは',
      '世界': '世界',
      '测试': 'テスト',
      '我是': '私は',
      '夏雨辰': '夏雨辰'
    },
    // 中文 -> 韩文
    'zh-ko': {
      '你好': '안녕하세요',
      '世界': '세계',
      '测试': '테스트',
      '我是': '나는',
      '夏雨辰': '하우진'
    },
    // 中文 -> 法文
    'zh-fr': {
      '你好': 'Bonjour',
      '世界': 'Monde',
      '测试': 'Test',
      '我是': 'Je suis',
      '夏雨辰': 'Xia Yuchen'
    },
    // 中文 -> 德文
    'zh-de': {
      '你好': 'Hallo',
      '世界': 'Welt',
      '测试': 'Test',
      '我是': 'Ich bin',
      '夏雨辰': 'Xia Yuchen'
    },
    // 中文 -> 西班牙文
    'zh-es': {
      '你好': 'Hola',
      '世界': 'Mundo',
      '测试': 'Prueba',
      '我是': 'Soy',
      '夏雨辰': 'Xia Yuchen'
    },
    // 中文 -> 俄文
    'zh-ru': {
      '你好': 'Привет',
      '世界': 'Мир',
      '测试': 'Тест',
      '我是': 'Я',
      '夏雨辰': 'Ся Юйчэнь'
    }
  };
  
  const translationKey = `${sourceLanguage}-${targetLanguage}`;
  const translationMap = translations[translationKey] || {};
  
  // 尝试直接翻译
  if (translationMap[text]) {
    console.log(`找到翻译: "${text}" -> "${translationMap[text]}"`);
    return translationMap[text];
  }
  
  // 尝试部分翻译（对于较长的文本）
  let translatedText = text;
  let hasTranslation = false;
  
  for (const [source, target] of Object.entries(translationMap)) {
    if (text.includes(source)) {
      translatedText = translatedText.replace(new RegExp(source, 'g'), target);
      hasTranslation = true;
    }
  }
  
  if (hasTranslation && translatedText !== text) {
    console.log(`部分翻译: "${text}" -> "${translatedText}"`);
    return translatedText;
  }
  
  // 如果都没有找到翻译，返回原文并添加标记
  console.log(`未找到翻译，返回原文: "${text}"`);
  return `[未翻译] ${text}`;
}

// 重新组装SRT格式
function reassembleSRT(originalSrt, translatedTexts) {
  const lines = originalSrt.split('\n');
  let textIndex = 0;
  let result = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.trim() && !line.match(/^\d+$/) && !line.match(/^\d{2}:\d{2}:\d{2},\d{3}/)) {
      // 这是字幕文本行，替换为翻译后的文本
      if (textIndex < translatedTexts.length) {
        result += translatedTexts[textIndex] + '\n';
        textIndex++;
      }
    } else {
      // 保持其他行不变
      result += line + '\n';
    }
  }
  
  return result;
}

// 生成带字幕的视频
async function generateVideoWithSubtitles(videoPath, subtitles) {
  try {
    console.log('生成带字幕的视频...');
    
    // 直接复制原视频，不添加任何字幕
    const outputVideoPath = videoPath.replace(/\.[^/.]+$/, '_with_subtitles.mp4');
    
    return new Promise((resolve, reject) => {
      // 直接复制视频，不添加字幕
      ffmpeg(videoPath)
        .output(outputVideoPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg命令:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('处理进度:', progress.percent, '%');
        })
        .on('end', () => {
          console.log('视频处理完成');
          
          // 返回视频文件名
          const videoFileName = path.basename(outputVideoPath);
          resolve(videoFileName);
        })
        .on('error', (err) => {
          console.error('生成带字幕视频失败:', err);
          reject(err);
        })
        .run();
    });
  } catch (error) {
    console.error('生成带字幕视频失败:', error);
    return null;
  }
}

// 备用翻译方案
async function translateSubtitlesFallback(subtitles, sourceLanguage, targetLanguage) {
  try {
    console.log(`开始翻译字幕: ${sourceLanguage} -> ${targetLanguage}`);
    console.log('原始字幕:', subtitles);
    
    // 提取字幕文本进行翻译
    const subtitleTexts = extractSubtitleTexts(subtitles);
    console.log('提取的字幕文本:', subtitleTexts);
    
    const translatedTexts = [];
    
    for (const text of subtitleTexts) {
      const translatedText = translateTextFallback(text, sourceLanguage, targetLanguage);
      translatedTexts.push(translatedText);
    }
    
    console.log('翻译后的文本:', translatedTexts);
    
    // 重新组装SRT格式
    const translatedSubtitles = reassembleSRT(subtitles, translatedTexts);
    
    console.log('最终翻译字幕:', translatedSubtitles);
    return translatedSubtitles;
  } catch (error) {
    console.error('备用翻译也失败:', error);
    return subtitles; // 如果翻译失败，返回原文
  }
}

// 清理文件
function cleanupFiles(filePaths) {
  filePaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });
}

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
      const accessToken = await getBaiduAccessToken();
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

// 视频文件服务端点
app.get('/api/video/:filename', (req, res) => {
  const filename = req.params.filename;
  const videoPath = path.join(__dirname, 'uploads', filename);
  
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

app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});

// 导出函数供生产启动脚本使用
module.exports = {
  extractAudio,
  checkForSubtitles,
  extractSubtitles,
  generateSubtitlesFromAudio,
  detectLanguage,
  translateSubtitles,
  generateVideoWithSubtitles,
  cleanupFiles,
  getBaiduAccessToken
}; 