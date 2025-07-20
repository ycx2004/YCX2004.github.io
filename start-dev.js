const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 启动视频字幕翻译器开发环境...\n');

// 启动后端服务器
console.log('📡 启动后端服务器...');
const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, 'server'),
  stdio: 'inherit',
  shell: true
});

// 等待2秒后启动前端服务器
setTimeout(() => {
  console.log('🌐 启动前端服务器...');
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: __dirname,
    stdio: 'inherit',
    shell: true
  });

  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    backend.kill();
    frontend.kill();
    process.exit();
  });

  frontend.on('close', (code) => {
    console.log(`前端服务器已退出，退出码: ${code}`);
    backend.kill();
  });
}, 2000);

backend.on('close', (code) => {
  console.log(`后端服务器已退出，退出码: ${code}`);
});

console.log('✅ 开发环境启动完成！');
console.log('📱 前端地址: http://localhost:3000');
console.log('🔧 后端地址: http://localhost:3001');
console.log('⏹️  按 Ctrl+C 停止所有服务器\n'); 