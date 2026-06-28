# 小小英语对话官

面向北京一年级学生的移动端英语日常对话练习 H5 MVP。产品数据、语音检测反馈和家长报告均在本地完成，不依赖后端。

## 本地运行

```bash
npm install
npm run dev
```

构建生产版本：

```bash
npm run build
npm run preview
```

## 固定配音音频

当前版本不再使用浏览器 Web Speech / 系统 TTS，所有“播放 / 再听一遍 / 慢一点”都读取本地固定音频文件：

- TTS 模型：Kokoro-82M
- 语言：American English
- 声音：af_heart
- 采样率：24kHz
- 音频目录：`public/audio/kokoro-82m/af_heart/en-us/24k/`
- 播放策略：`normal/` 正常语速优先播放 MP3，失败后依次尝试 AAC、WAV；`slow/` 为慢速版本。
- 当前本机没有 ffmpeg 时会先生成 WAV；安装 ffmpeg 后重新运行 `npm run audio:kokoro` 会补齐 MP3/AAC 播放版。

导出当前产品里的固定英文脚本：

```bash
npm run audio:script
```

生成 WAV 母版和 MP3/AAC 播放版：

```bash
python3 -m pip install kokoro soundfile numpy
# 推荐：慢网络下延长 Hugging Face 下载超时，并禁用 Xet 下载器
HF_HUB_DISABLE_XET=1 HF_HUB_DOWNLOAD_TIMEOUT=300 npm run audio:kokoro
```

生成后的结构示例：

```text
public/audio/kokoro-82m/af_heart/en-us/24k/
  script.json
  master/tts-xxxxxxxx.wav
  normal/tts-xxxxxxxx.mp3
  normal/tts-xxxxxxxx.aac
  slow/tts-xxxxxxxx.mp3
  slow/tts-xxxxxxxx.aac
```

## 核心流程

首页 → 场景导入 → 3 组 × 3 轮对话 → 每组点评 → 重点复练 → 今日完成 → 首页长按进入家长报告。

录音按钮只在设备本地检测声音强弱，不保存或上传孩子录音。
