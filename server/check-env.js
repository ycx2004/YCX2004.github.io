const fs = require('fs');
const path = require('path');
require('dotenv').config();

console.log('🔍 检查环境变量配置...\n');

// 检查.env文件是否存在
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('✅ .env文件存在');
  
  // 读取.env文件内容
  const envContent = fs.readFileSync(envPath, 'utf8');
  console.log('\n📄 .env文件内容:');
  console.log(envContent);
  
  // 检查百度AI配置
  if (process.env.BAIDU_APP_ID && process.env.BAIDU_API_KEY && process.env.BAIDU_SECRET_KEY) {
    console.log('\n✅ 百度AI配置已完整');
    console.log(`APP_ID: ${process.env.BAIDU_APP_ID}`);
    console.log(`API_KEY: ${process.env.BAIDU_API_KEY.substring(0, 10)}...`);
    console.log(`SECRET_KEY: ${process.env.BAIDU_SECRET_KEY.substring(0, 10)}...`);
  } else {
    console.log('\n❌ 百度AI配置不完整');
    console.log('请在.env文件中添加:');
    console.log('BAIDU_APP_ID=your_baidu_app_id_here');
    console.log('BAIDU_API_KEY=your_baidu_api_key_here');
    console.log('BAIDU_SECRET_KEY=your_baidu_secret_key_here');
  }
  
  // 检查腾讯云翻译配置
  if (process.env.TENCENT_SECRET_ID && process.env.TENCENT_SECRET_KEY) {
    console.log('\n✅ 腾讯云翻译配置已完整');
    console.log(`SECRET_ID: ${process.env.TENCENT_SECRET_ID.substring(0, 10)}...`);
    console.log(`SECRET_KEY: ${process.env.TENCENT_SECRET_KEY.substring(0, 10)}...`);
  } else {
    console.log('\n❌ 腾讯云翻译配置不完整');
    console.log('请在.env文件中添加:');
    console.log('TENCENT_SECRET_ID=your_tencent_secret_id_here');
    console.log('TENCENT_SECRET_KEY=your_tencent_secret_key_here');
  }
  
  // 检查端口配置
  if (process.env.PORT) {
    console.log(`✅ PORT已配置: ${process.env.PORT}`);
  } else {
    console.log('ℹ️  PORT未配置，将使用默认端口3001');
  }
  
} else {
  console.log('❌ .env文件不存在');
  console.log('请创建.env文件并添加以下内容:');
  console.log('OPENAI_API_KEY=your_openai_api_key_here');
  console.log('PORT=3001');
}

console.log('\n📋 检查完成！'); 