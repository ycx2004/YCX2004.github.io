# API配置指南

## 百度AI语音识别配置

### 1. 注册百度AI开放平台
- 访问：https://ai.baidu.com/
- 注册并登录账户

### 2. 创建应用
- 进入"控制台" -> "语音技术"
- 创建新应用，选择"语音识别"
- 获取以下信息：
  - APP_ID
  - API_KEY
  - SECRET_KEY

### 3. 配置到项目中
在 `server/.env` 文件中添加：
```
BAIDU_APP_ID=你的APP_ID
BAIDU_API_KEY=你的API_KEY
BAIDU_SECRET_KEY=你的SECRET_KEY
```

## 腾讯云翻译配置

### 1. 注册腾讯云
- 访问：https://cloud.tencent.com/
- 注册并登录账户

### 2. 开通机器翻译服务
- 进入"产品" -> "人工智能" -> "机器翻译"
- 开通服务并获取密钥

### 3. 配置到项目中
在 `server/.env` 文件中添加：
```
TENCENT_SECRET_ID=你的SECRET_ID
TENCENT_SECRET_KEY=你的SECRET_KEY
```

## 测试配置

运行以下命令测试API配置：
```bash
cd server
node check-env.js
```

## 免费额度说明

### 百度AI
- 语音识别：每天500次免费调用
- 支持中文、英文等多种语言

### 腾讯云翻译
- 机器翻译：每月500万字符免费额度
- 支持多种语言互译

## 注意事项

1. 请妥善保管API密钥，不要泄露给他人
2. 建议设置API调用限制，避免超出免费额度
3. 如果遇到网络问题，可以尝试使用代理 