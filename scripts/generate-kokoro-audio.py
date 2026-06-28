#!/usr/bin/env python3
"""Generate fixed Kokoro-82M audio assets for the H5 practice app.

Expected setup:
  python3 -m pip install kokoro soundfile numpy
  ffmpeg is preferred for MP3/AAC playback copies.
  If ffmpeg is absent, the script still generates 24kHz WAV assets that the app can play.

Output contract:
  public/audio/kokoro-82m/af_heart/en-us/24k/master/{id}.wav
  public/audio/kokoro-82m/af_heart/en-us/24k/normal/{id}.mp3
  public/audio/kokoro-82m/af_heart/en-us/24k/normal/{id}.aac
  public/audio/kokoro-82m/af_heart/en-us/24k/slow/{id}.mp3
  public/audio/kokoro-82m/af_heart/en-us/24k/slow/{id}.aac
"""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline
except ImportError as exc:
    raise SystemExit(
        "Missing Kokoro audio dependencies. Install them first:\n"
        "  python3 -m pip install kokoro soundfile numpy\n"
        f"Original error: {exc}"
    )


SAMPLE_RATE = 24000
VOICE = "af_heart"
LANG_CODE = "a"  # Kokoro language code for American English.


def render_wav(pipeline: KPipeline, text: str, speed: float, wav_path: Path) -> None:
    wav_path.parent.mkdir(parents=True, exist_ok=True)
    chunks: list[np.ndarray] = []
    for _, _, audio in pipeline(text, voice=VOICE, speed=speed):
        chunks.append(np.asarray(audio, dtype=np.float32))
    if not chunks:
        raise RuntimeError(f"Kokoro returned no audio for: {text}")
    sf.write(wav_path, np.concatenate(chunks), SAMPLE_RATE)


def encode_playback(wav_path: Path, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not shutil.which("ffmpeg"):
        return
    codec_args = ["-codec:a", "libmp3lame", "-b:a", "96k"] if output_path.suffix == ".mp3" else ["-c:a", "aac", "-b:a", "96k"]
    subprocess.run(
        ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(wav_path), "-ar", str(SAMPLE_RATE), *codec_args, str(output_path)],
        check=True,
    )


def main() -> int:
    if len(sys.argv) != 2:
        print("Usage: python3 scripts/generate-kokoro-audio.py public/audio/kokoro-82m/af_heart/en-us/24k/script.json", file=sys.stderr)
        return 2
    script_path = Path(sys.argv[1]).resolve()
    root = script_path.parent
    data = json.loads(script_path.read_text(encoding="utf-8"))
    items = data["items"]
    pipeline = KPipeline(lang_code=LANG_CODE)

    for item in items:
        audio_id = item["id"]
        text = item["text"]
        master_wav = root / "master" / f"{audio_id}.wav"
        normal_wav = root / "normal" / f"{audio_id}.wav"
        slow_wav = root / "slow" / f"{audio_id}.wav"

        if not master_wav.exists():
            render_wav(pipeline, text, speed=1.0, wav_path=master_wav)
        if not normal_wav.exists():
            shutil.copyfile(master_wav, normal_wav)
        if not slow_wav.exists():
            render_wav(pipeline, text, speed=0.72, wav_path=slow_wav)

        for folder, source_wav in (("normal", normal_wav), ("slow", slow_wav)):
            for ext in ("mp3", "aac"):
                output_path = root / folder / f"{audio_id}.{ext}"
                if not output_path.exists():
                    encode_playback(source_wav, output_path)
        print(f"✓ {audio_id} {text}")

    print(f"Generated Kokoro-82M {VOICE} assets for {len(items)} lines under {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
