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
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  databaseURL: process.env.FIREBASE_DB_URL
};

// Firebase Admin初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: firebaseConfig.databaseURL
  });
}
const db = admin.database();

// 固定メンバーリスト（M2→B4順）
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

// とりあえず全員「未登録許可」にする（後でユーザーID紐づけ可）
const userIdMap = {}; // LINE ID -> member key

// ====== Webhookエンドポイント ======
app.post('/webhook', line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error('Error in webhook:', err);
      res.status(500).end();
    });
});

// 動作確認用ルート
app.get('/', (req, res) => {
  res.send('LINE Bot + Firebase is running!');
});

// ====== メインのイベント処理 ======
async function handleEvent(event) {
  // メッセージ以外は無視
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const text = event.message.text;

  // メンバー判別（仮に全員OKにする）
  let memberKey = userIdMap[userId];

  if (!memberKey) {
    // 仮でテスト用に鹿島固定
    memberKey = 'kashima';
  }

  // 更新時刻（MM/DD HH:mm）
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
