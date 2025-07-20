import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileVideo, Languages, Download, Loader2, Play, Eye } from 'lucide-react'
import './App.css'

function App() {
  const [videoFile, setVideoFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [subtitles, setSubtitles] = useState(null)
  const [translatedSubtitles, setTranslatedSubtitles] = useState(null)
  const [videoWithSubtitles, setVideoWithSubtitles] = useState(null)
  const [error, setError] = useState(null)
  const [targetLanguage, setTargetLanguage] = useState('zh') // 默认翻译成中文
  const [detectedLanguage, setDetectedLanguage] = useState(null)

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0]
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file)
      setError(null)
      setSubtitles(null)
      setTranslatedSubtitles(null)
    } else {
      setError('请上传有效的视频文件')
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv']
    },
    multiple: false
  })

  const processVideo = async () => {
    if (!videoFile) return

    setIsProcessing(true)
    setError(null)

    try {
      // 创建FormData对象
      const formData = new FormData()
      formData.append('video', videoFile)
      formData.append('targetLanguage', targetLanguage)

      // 发送到后端API进行处理
      const response = await fetch('http://localhost:3001/api/process-video', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('视频处理失败')
      }

      const result = await response.json()
      console.log('处理结果:', result)
      setSubtitles(result.subtitles)
      setTranslatedSubtitles(result.translatedSubtitles)
      setVideoWithSubtitles(result.videoWithSubtitles)
      setDetectedLanguage(result.detectedLanguage)
    } catch (err) {
      setError(err.message || '处理视频时发生错误')
    } finally {
      setIsProcessing(false)
    }
  }

  const downloadSubtitles = (subtitles, filename) => {
    const blob = new Blob([subtitles], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const previewWithSubtitles = () => {
    if (!videoFile || !translatedSubtitles) return
    
    // 创建视频文件的blob URL
    const videoUrl = URL.createObjectURL(videoFile)
    
    // 解析字幕数据
    const subtitleData = parseSubtitlesData(translatedSubtitles)
    
    // 打开预览窗口
    const previewWindow = window.open('', '_blank', 'width=900,height=700')
    previewWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>视频字幕预览</title>
        <meta charset="utf-8">
        <style>
          body { margin: 0; padding: 20px; background: #1a1a1a; color: white; font-family: "Microsoft YaHei", "SimHei", Arial, sans-serif; }
          .video-container { max-width: 100%; text-align: center; position: relative; }
          video { max-width: 100%; height: auto; border-radius: 10px; }
          h1 { text-align: center; margin-bottom: 20px; }
          .controls { margin-top: 20px; text-align: center; }
          button { padding: 10px 20px; margin: 5px; border: none; border-radius: 5px; cursor: pointer; }
          .close-btn { background: #e53e3e; color: white; }
          .download-btn { background: #38a169; color: white; }
          .subtitle-info { margin-top: 10px; padding: 10px; background: #2d3748; border-radius: 5px; }
          .subtitle-display { 
            position: absolute; 
            bottom: 20px; 
            left: 50%; 
            transform: translateX(-50%); 
            background: rgba(0,0,0,0.9); 
            color: #ffffff; 
            padding: 15px 25px; 
            border-radius: 8px; 
            font-size: 20px; 
            font-weight: bold;
            max-width: 80%; 
            text-align: center;
            display: none;
            font-family: "Microsoft YaHei", "SimHei", "Arial", sans-serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            border: 2px solid rgba(255,255,255,0.3);
            white-space: pre-wrap;
            word-wrap: break-word;
            z-index: 1000;
          }
        </style>
      </head>
      <body>
        <h1>视频字幕预览</h1>
        <div class="video-container">
          <video controls id="videoPlayer">
            <source src="${videoUrl}" type="video/mp4">
            您的浏览器不支持视频播放
          </video>
          <div class="subtitle-display" id="subtitleDisplay"></div>
        </div>
        <div class="subtitle-info">
          <p>💡 提示：字幕会自动显示在视频下方</p>
          <p>当前字幕：<span id="currentSubtitle">等待播放...</span></p>
        </div>
        <div class="controls">
          <button class="download-btn" onclick="downloadSubtitle()">下载字幕文件</button>
          <button class="close-btn" onclick="window.close()">关闭预览</button>
        </div>
        <script>
          // 字幕数据
          const subtitleData = ${JSON.stringify(subtitleData)};
          
          function downloadSubtitle() {
            const subtitleContent = \`${translatedSubtitles.replace(/`/g, '\\`')}\`;
            const blob = new Blob([subtitleContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'translated_subtitles.srt';
            link.click();
            URL.revokeObjectURL(url);
          }
          
          // 字幕显示逻辑
          window.onload = function() {
            const video = document.querySelector('#videoPlayer');
            const subtitleDisplay = document.querySelector('#subtitleDisplay');
            const currentSubtitleSpan = document.querySelector('#currentSubtitle');
            
            if (video) {
              console.log('字幕数据:', subtitleData);
              
              // 监听时间更新，显示对应字幕
              video.addEventListener('timeupdate', function() {
                const currentTime = video.currentTime;
                const currentSubtitle = findSubtitleAtTime(subtitleData, currentTime);
                
                if (currentSubtitle) {
                  subtitleDisplay.textContent = currentSubtitle;
                  subtitleDisplay.style.display = 'block';
                  currentSubtitleSpan.textContent = currentSubtitle;
                  console.log('显示字幕:', currentSubtitle);
                } else {
                  subtitleDisplay.style.display = 'none';
                  currentSubtitleSpan.textContent = '无字幕';
                }
              });
              
              // 添加测试字幕显示
              setTimeout(() => {
                subtitleDisplay.textContent = '测试字幕显示 - 如果您看到这段文字，说明字幕功能正常';
                subtitleDisplay.style.display = 'block';
                currentSubtitleSpan.textContent = '测试字幕';
              }, 2000);
            }
          };
          
          // 查找当前时间对应的字幕
          function findSubtitleAtTime(subtitles, currentTime) {
            for (const subtitle of subtitles) {
              if (currentTime >= subtitle.start && currentTime <= subtitle.end) {
                return subtitle.text;
              }
            }
            return null;
          }
        </script>
      </body>
      </html>
    `)
    previewWindow.document.close()
  }

  // 解析字幕数据
  const parseSubtitlesData = (srtContent) => {
    console.log('解析字幕内容:', srtContent)
    const lines = srtContent.split('\n')
    const subtitles = []
    let currentSubtitle = null
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (/^\d+$/.test(line)) {
        // 跳过序号行
        continue
      }
      
      if (line.includes('-->')) {
        // 时间行
        const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/)
        if (timeMatch) {
          const startTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000
          const endTime = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000
          
          currentSubtitle = {
            start: startTime,
            end: endTime,
            text: ''
          }
          console.log('找到时间行:', line)
        }
      } else if (line && currentSubtitle) {
        // 字幕文本行
        currentSubtitle.text += line + ' '
        console.log('添加字幕文本:', line)
      } else if (!line && currentSubtitle && currentSubtitle.text) {
        // 空行，完成当前字幕
        currentSubtitle.text = currentSubtitle.text.trim()
        subtitles.push(currentSubtitle)
        console.log('完成字幕:', currentSubtitle)
        currentSubtitle = null
      }
    }
    
    console.log('解析完成，字幕数量:', subtitles.length)
    return subtitles
  }

  // 将SRT格式转换为WebVTT格式
  const convertSrtToWebVtt = (srtContent) => {
    console.log('转换SRT到WebVTT，原始内容:', srtContent)
    
    // 添加WebVTT头部
    let webvtt = 'WEBVTT\n\n'
    
    // 处理SRT内容
    const lines = srtContent.split('\n')
    let i = 0
    
    while (i < lines.length) {
      // 跳过序号行
      if (/^\d+$/.test(lines[i].trim())) {
        i++
        continue
      }
      
      // 处理时间行
      if (lines[i].includes('-->')) {
        const timeLine = lines[i]
        // 将SRT时间格式转换为WebVTT格式
        const webvttTimeLine = timeLine.replace(',', '.')
        webvtt += webvttTimeLine + '\n'
        i++
        
        // 处理字幕文本
        let subtitleText = ''
        while (i < lines.length && lines[i].trim() !== '') {
          subtitleText += lines[i].trim() + ' '
          i++
        }
        webvtt += subtitleText.trim() + '\n\n'
      } else {
        i++
      }
    }
    
    console.log('转换后的WebVTT内容:', webvtt)
    return webvtt
  }

  // 初始化主页面字幕显示
  React.useEffect(() => {
    if (videoWithSubtitles && translatedSubtitles) {
      const video = document.getElementById('mainVideoPlayer')
      const subtitleDisplay = document.getElementById('mainSubtitleDisplay')
      
      if (video && subtitleDisplay) {
        // 解析字幕数据
        const subtitleData = parseSubtitlesData(translatedSubtitles)
        
        // 监听时间更新，显示对应字幕
        const handleTimeUpdate = () => {
          const currentTime = video.currentTime
          const currentSubtitle = findSubtitleAtTime(subtitleData, currentTime)
          
          if (currentSubtitle) {
            subtitleDisplay.textContent = currentSubtitle
            subtitleDisplay.style.display = 'block'
          } else {
            subtitleDisplay.style.display = 'none'
          }
        }
        
        video.addEventListener('timeupdate', handleTimeUpdate)
        
        // 清理函数
        return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate)
        }
      }
    }
  }, [videoWithSubtitles, translatedSubtitles])

  // 查找当前时间对应的字幕
  const findSubtitleAtTime = (subtitles, currentTime) => {
    for (const subtitle of subtitles) {
      if (currentTime >= subtitle.start && currentTime <= subtitle.end) {
        return subtitle.text
      }
    }
    return null
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>视频字幕翻译器</h1>
          <p>拖拽上传MP4视频，自动识别语言并翻译字幕</p>
        </header>

        <main className="main">
          {!videoFile ? (
            <div
              {...getRootProps()}
              className={`dropzone ${isDragActive ? 'active' : ''}`}
            >
              <input {...getInputProps()} />
              <Upload size={48} />
              <h3>拖拽视频文件到这里</h3>
              <p>或者点击选择文件</p>
              <p className="supported-formats">支持的格式: MP4, AVI, MOV, MKV</p>
            </div>
          ) : (
            <div className="video-info">
              <div className="file-info">
                <FileVideo size={24} />
                <span>{videoFile.name}</span>
                <span className="file-size">
                  ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>

              <div className="language-selection">
                <label htmlFor="targetLanguage">目标语言：</label>
                <select
                  id="targetLanguage"
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value)}
                  className="language-select"
                >
                  <option value="zh">中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="es">Español</option>
                  <option value="ru">Русский</option>
                </select>
              </div>
              <div className="actions">
                <button
                  onClick={processVideo}
                  disabled={isProcessing}
                  className="process-btn"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="spinner" />
                      处理中...
                    </>
                  ) : (
                    <>
                      <Languages />
                      开始处理
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setVideoFile(null)
                    setSubtitles(null)
                    setTranslatedSubtitles(null)
                    setVideoWithSubtitles(null)
                    setError(null)
                    setDetectedLanguage(null)
                  }}
                  className="reset-btn"
                >
                  重新选择
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="error">
              <p>{error}</p>
            </div>
          )}

          {subtitles && (
            <div className="results">
              <div className="subtitles-section">
                <h3>原始字幕</h3>
                <div className="subtitles-content">
                  <pre>{subtitles}</pre>
                </div>
                <button
                  onClick={() => downloadSubtitles(subtitles, 'original_subtitles.srt')}
                  className="download-btn"
                >
                  <Download size={16} />
                  下载原始字幕
                </button>
              </div>

              {translatedSubtitles && (
                <div className="subtitles-section">
                  <h3>翻译后字幕</h3>
                  <div className="subtitles-content">
                    <pre>{translatedSubtitles}</pre>
                  </div>
                  <div className="subtitle-actions">
                    <button
                      onClick={() => downloadSubtitles(translatedSubtitles, 'translated_subtitles.srt')}
                      className="download-btn"
                    >
                      <Download size={16} />
                      下载翻译字幕
                    </button>
                    <button
                      onClick={() => previewWithSubtitles()}
                      className="preview-btn"
                    >
                      <Play size={16} />
                      预览字幕效果
                    </button>
                    <div className="info-text">
                      💡 提示：点击"预览字幕效果"可以在网页中查看带字幕的视频
                    </div>
                  </div>
                </div>
              )}

              {videoWithSubtitles && (
                <div className="video-preview-section">
                  <h3>带字幕的视频预览</h3>
                  <div className="video-container">
                    <video 
                      controls 
                      className="video-player"
                      src={`http://localhost:3001/api/video/${videoWithSubtitles}`}
                      crossOrigin="anonymous"
                      id="mainVideoPlayer"
                    >
                      您的浏览器不支持视频播放
                    </video>
                    <div className="subtitle-display" id="mainSubtitleDisplay"></div>
                  </div>
                  <div className="video-actions">
                    <button
                      onClick={() => window.open(`http://localhost:3001/api/video/${videoWithSubtitles}`, '_blank')}
                      className="preview-btn"
                    >
                      <Eye size={16} />
                      在新窗口打开
                    </button>
                    <button
                      onClick={() => {
                        const link = document.createElement('a')
                        link.href = `http://localhost:3001/api/video/${videoWithSubtitles}`
                        link.download = videoWithSubtitles
                        link.click()
                      }}
                      className="download-btn"
                    >
                      <Download size={16} />
                      下载视频
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default App 