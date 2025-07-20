#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 检查环境变量配置...\n');

// 检查服务器环境变量
const serverEnvPath = path.join(__dirname, 'server', '.env');
const requiredEnvVars = [
  'BAIDU_APP_ID',
  'BAIDU_API_KEY', 
  'BAIDU_SECRET_KEY',
  'TENCENT_SECRET_ID',
  'TENCENT_SECRET_KEY'
];

let allGood = true;

if (fs.existsSync(serverEnvPath)) {
  console.log('✅ 找到 server/.env 文件');
  
  const envContent = fs.readFileSync(serverEnvPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });
  
  console.log('\n📋 环境变量状态:');
  
  requiredEnvVars.forEach(varName => {
    if (envVars[varName]) {
      console.log(`✅ ${varName}: 已配置`);
    } else {
      console.log(`❌ ${varName}: 未配置`);
      allGood = false;
    }
  });
  
} else {
  console.log('❌ 未找到 server/.env 文件');
  console.log('请复制 server/env.example 为 server/.env 并配置环境变量');
  allGood = false;
}

console.log('\n📝 部署平台环境变量配置:');

const platforms = [
  {
    name: 'Railway',
    url: 'https://railway.app/',
    vars: requiredEnvVars
  },
  {
    name: 'Render', 
    url: 'https://render.com/',
    vars: requiredEnvVars
  },
  {
    name: 'DigitalOcean App Platform',
    url: 'https://cloud.digitalocean.com/apps',
    vars: requiredEnvVars
  },
  {
    name: 'Heroku',
    url: 'https://heroku.com/',
    vars: requiredEnvVars
  }
];

platforms.forEach(platform => {
  console.log(`\n🌐 ${platform.name} (${platform.url}):`);
  platform.vars.forEach(varName => {
    console.log(`   ${varName}=您的${varName}值`);
  });
});

if (allGood) {
  console.log('\n✅ 环境变量配置完整，可以开始部署！');
  console.log('\n🚀 推荐部署方式:');
  console.log('1. Railway (最简单): 使用 deploy-railway.sh 脚本');
  console.log('2. 手动部署: 参考 DEPLOYMENT.md 文件');
} else {
  console.log('\n❌ 请先配置环境变量再部署');
  console.log('\n📖 详细配置说明请参考:');
  console.log('- API_SETUP.md (API密钥获取)');
  console.log('- DEPLOYMENT.md (部署指南)');
}

console.log('\n📚 相关文档:');
console.log('- README.md: 项目介绍和使用说明');
console.log('- DEPLOYMENT.md: 详细部署指南');
console.log('- API_SETUP.md: API配置说明'); 