<!--
## 13.x.x (unreleased)

### Improvements

### Bugfixes
-

You should also include the user name that made the change.
-->
## 1.0.0 (2023/10/02)

### Improvements
- Client: MFM描画をMisskey最新版に準拠(位置ズレ修正)
- Client: データセーバーモードの追加
- Client: WaveとFlacを再生可能に
- Client: 画像ダウンロードボタンを追加
- Client: ノートに使用されている絵文字を長押しするとトーストで確認可能に(一部ブラウザがtitle表示非対応の為)
- Client: UIの微調整
- Server: 3種のエラー画像を設定可能に
- Server: icoファイルに対応
- Server: ドライブ周りの機能改善
- Both: 各種最適化

### Bugfixes
- Client: 画像表示時に戻るボタンを押すとページごと戻る挙動を修正
- Server: キュー画面の認証を回避できる問題の修正


## Misskey 13.6.1 (2023/02/12, Based package)

### Improvements
- アニメーションを少なくする設定の時、MkPageHeaderのタブアニメーションを無効化
- Backend: activitypub情報がcorsでブロックされないようヘッダーを追加
- enhance: レートリミットを0%にできるように
- チャンネル内Renoteを行えるように

### Bugfixes
- Client: ユーザーページでアクティビティを見ることができない問題を修正
