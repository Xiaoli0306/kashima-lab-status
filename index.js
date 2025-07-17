import express from 'express';
import line from '@line/bot-sdk';

const app = express();
const port = process.env.PORT || 3000;

// LINE Bot設定
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};

// Webhook受信確認用エンドポイント
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  console.log('==========================');
  console.log('📩 Webhook HIT!!');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('==========================');

  // LINEは200返さないと再送し続けるので必ず返す
  res.status(200).end();
});

// 動作確認用のルート
app.get('/', (req, res) => {
  res.send('✅ LINE Webhook Debug Server is running!');
});

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
