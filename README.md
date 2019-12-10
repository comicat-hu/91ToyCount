蛋鋪一番賞即時數量通知專用

---

## how to use

* Require NodeJS >= 8.0.0
* Run npm install
* Copy .env.example to .env and set your logs and slack notification settings, you can skip slack settings if you running on debug mode.
* Copy targets.json.example to targets.json and set whole url you want to follow.
* Run `npm start` with default mode, run `npm run debug` with debug mode.
* You can run `node index.js` with cornjob by yourself, the script will send notification by checking if recent total count be changed.
* (Cache data will store in store.json with expire=86400 seconds)
