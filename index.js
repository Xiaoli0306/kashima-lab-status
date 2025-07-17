import express from 'express';
import line from '@line/bot-sdk';

const app = express();
const port = process.env.PORT || 3000;

// ====== LINE Bot設定 ======
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new line.Client(lineConfig);

// ====== Webhookエンドポイント ======
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  console.log('==========================');
  console.log('📩 Webhook HIT!!');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('==========================');

  // 応答がない場合でもLINE側に200を返す
  if (!req.body.events || req.body.events.length === 0) {
    console.log('⚠️ events が空です！');
    return res.status(200).end();
  }

  // イベントごとに処理
  Promise.all(
    req.body.events.map(async (event) => {
      if (event.type === 'message' && event.message.type === 'text') {
        // 送られたメッセージをそのままオウム返し
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: `オウム返し: ${event.message.text}`
        });
      }
    })
  )
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error('❌ Error in webhook:', err);
      res.status(500).end();
    });
});

// 動作確認用ルート
ap
