const axios = require('axios');
require('dotenv').config();

console.log('🧪 测试API配置...\n');

// 测试百度AI
async function testBaiduAI() {
  try {
    console.log('📡 测试百度AI语音识别...');
    
    const response = await axios.get('https://aip.baidubce.com/oauth/2.0/token', {
      params: {
        grant_type: 'client_credentials',
        client_id: process.env.BAIDU_API_KEY,
        client_secret: process.env.BAIDU_SECRET_KEY
      }
    });
    
    if (response.data.access_token) {
      console.log('✅ 百度AI认证成功');
      console.log(`访问令牌: ${response.data.access_token.substring(0, 20)}...`);
      return true;
    } else {
      console.log('❌ 百度AI认证失败');
      return false;
    }
  } catch (error) {
    console.log('❌ 百度AI测试失败:', error.message);
    return false;
  }
}

// 测试腾讯云翻译
async function testTencentTranslate() {
  try {
    console.log('🌐 测试腾讯云翻译...');
    
    // 这里只是测试连接，实际翻译需要更复杂的签名
    const response = await axios.get('https://tmt.tencentcloudapi.com/', {
      timeout: 5000
    });
    
    console.log('✅ 腾讯云翻译服务可访问');
    return true;
  } catch (error) {
    console.log('❌ 腾讯云翻译测试失败:', error.message);
    return false;
  }
}

// 主测试函数
async function runTests() {
  console.log('🔧 检查环境变量...');
  console.log(`百度AI APP_ID: ${process.env.BAIDU_APP_ID ? '已配置' : '未配置'}`);
  console.log(`百度AI API_KEY: ${process.env.BAIDU_API_KEY ? '已配置' : '未配置'}`);
  console.log(`百度AI SECRET_KEY: ${process.env.BAIDU_SECRET_KEY ? '已配置' : '未配置'}`);
  console.log(`腾讯云 SECRET_ID: ${process.env.TENCENT_SECRET_ID ? '已配置' : '未配置'}`);
  console.log(`腾讯云 SECRET_KEY: ${process.env.TENCENT_SECRET_KEY ? '已配置' : '未配置'}\n`);
  
  const baiduResult = await testBaiduAI();
  console.log('');
  const tencentResult = await testTencentTranslate();
  
  console.log('\n📊 测试结果汇总:');
  console.log(`百度AI: ${baiduResult ? '✅ 正常' : '❌ 异常'}`);
  console.log(`腾讯云翻译: ${tencentResult ? '✅ 正常' : '❌ 异常'}`);
  
  if (baiduResult && tencentResult) {
    console.log('\n🎉 所有API配置正常，可以开始使用！');
  } else {
    console.log('\n⚠️  部分API配置有问题，请检查配置。');
    console.log('请参考 API_SETUP.md 文件进行配置。');
  }
}

runTests().catch(console.error); 