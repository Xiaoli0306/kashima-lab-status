import express from 'express';
import line from '@line/bot-sdk';
import admin from 'firebase-admin';

const app = express();
const port = process.env.PORT || 3000;

// ====== LINE Bot設定 ======
const lineConfig = {
  channelAccessToken: process.env.LINE_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET
};
const client = new line.Client(lineConfig);

// ====== Firebase設定 ======
let rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

// Vercelでは\ nが\\nになっている場合があるので両対応
if (rawServiceAccount.includes('\\n')) {
  rawServiceAccount = rawServiceAccount.replace(/\\n/g, '\n');
}

const serviceAccount = JSON.parse(rawServiceAccount);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DB_URL
  });
}
const db = admin.database();

// 固定メンバーリスト
const memberList = [
  { id: 'kashima', name: '鹿島' },
  { id: 'inpyo', name: '陰平' },
  { id: 'amami', name: '天海' },
  { id: 'ube', name: '宇部' },
  { id: 'suzuki', name: '鈴木' },
  { id: 'fujita', name: '藤田' },
  { id: 'deguchi', name: '出口' },
  { id: 'adachi', name: '安達' },
  { id: 'arakida', name: '荒木田' }
];

const userIdMap = {}; // LINE ID -> member key

// ====== Webhookエンドポイント ======
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  console.log('==========================');
  console.log('📩 Webhook HIT!!');
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('==========================');

  if (!req.body.events || req.body.events.length === 0) {
    console.log('⚠️ events が空です！');
    return res.status(200).end();  // 空でも200は返す
  }

  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('❌ Error in webhook:', err);
      res.status(500).json({ error: err.message, stack: err.stack });
    });
});

// 動作確認用ルート
app.get('/', (req, res) => {
  res.send('LINE Bot + Firebase is running!');
});

// ====== メインのイベント処理 ======
async function handleEvent(event) {
  console.log('👉 Handling event:', event);

  // Webhook検証イベントはreplyTokenがダミーなのでスキップ
  if (event.replyToken === '00000000000000000000000000000000') {
    console.log('✅ Webhook検証イベントなので返信スキップ');
    return Promise.resolve(null);
  }

  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const text = event.message.text;

  let memberKey = userIdMap[userId] || 'kashima'; // 仮に鹿島固定

  const now = new Date();
  const updatedAt = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}`;

  // Firebaseに書き込み（30文字に切る）
  await db.ref(`members/${memberKey}`).set({
    name: memberList.find((m) => m.id === memberKey).name,
    message: text.substring(0, 30),
    updated_at: updatedAt
  });

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ ステータス更新しました！\n「${text.substring(
      0,
      30
    )}」 (${updatedAt})`
  });
}

// サーバー起動
app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
