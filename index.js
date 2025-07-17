// ====== 必要なライブラリをインストールする ======
// npm install express @line/bot-sdk firebase-admin body-parser

import express from 'express';
import line from '@line/bot-sdk';
import bodyParser from 'body-parser';
import admin from 'firebase-admin';

// ====== LINE Bot設定 ======
const lineConfig = {
  channelAccessToken: 'abTxJSxJECgpA3pdX1u2KL/n/iUtV9DXpbESilhlNfIN9zfMPC1oKmRSoXzAsUyyBL6faXDy9eo2iuGmtOmfsFTyWBJnt0VS5TMw5MwlBYgq4kUmvtbvUX/5U44DwGJ7g6lH+aqBL3+XOXXaEiQiNQdB04t89/1O/w1cDnyilFU=',
  channelSecret: '8f309dbf0a6ee762e9cf7763c498479e'
};

// ====== Firebase設定 ======
const firebaseConfig = {
  apiKey: "AIzaSyCh6S6NaBP4d2_2AMaNq7SOzAqAZr3l5Ok",
  databaseURL: "https://kashima-lab-status-default-rtdb.firebaseio.com"
};

// Firebase Admin初期化
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: firebaseConfig.databaseURL
});

const db = admin.database();
const app = express();
const port = process.env.PORT || 3000;
const lineClient = new line.Client(lineConfig);

// LINE Webhookの受け取り設定
app.use(bodyParser.json());
app.post('/webhook', (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

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

// ユーザーID→メンバー名マッピング（最初は空、LINE IDがわかったら紐づける）
const userIdMap = {
  // 'LINEのUserID': 'kashima'
};

// LINEイベント処理
async function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  const userId = event.source.userId;
  const text = event.message.text;

  // ユーザーIDが登録されてるか確認
  const memberKey = userIdMap[userId];
  if (!memberKey) {
    return lineClient.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ あなたはまだメンバー登録されていません。\n管理者に登録してもらってください。'
    });
  }

  // 時刻を作成（MM/DD HH:mm形式）
  const now = new Date();
  const updatedAt = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Firebaseに書き込み
  await db.ref(`members/${memberKey}`).set({
    name: memberList.find(m => m.id === memberKey).name,
    message: text.substring(0, 30), // 30文字制限
    updated_at: updatedAt
  });

  return lineClient.replyMessage(event.replyToken, {
    type: 'text',
    text: `✅ 更新しました！\n「${text.substring(0, 30)}」 (${updatedAt})`
  });
}

// サーバー起動
app.listen(port, () => {
  console.log(`LINE Bot + Firebase server running on port ${port}`);
});
