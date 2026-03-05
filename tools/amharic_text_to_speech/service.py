import asyncio
import io
import importlib

edge_tts = None

VOICE_MAP = {
    "male": "am-ET-AmehaNeural",
    "female": "am-ET-MekdesNeural",
}


async def _synthesize_edge_tts(text: str, voice_name: str):
    audio_buffer = io.BytesIO()
    communicator = edge_tts.Communicate(text=text, voice=voice_name)

    async for chunk in communicator.stream():
        if chunk.get("type") == "audio":
            audio_buffer.write(chunk.get("data", b""))

    audio_buffer.seek(0)
    return audio_buffer


def _load_edge_tts():
    global edge_tts
    if edge_tts is not None:
        return edge_tts

    try:
        edge_tts = importlib.import_module("edge_tts")
    except ImportError as exc:
        raise RuntimeError("edge-tts package is not installed.") from exc

    return edge_tts


def synthesize_amharic_speech(text: str, voice_key: str):
    """Generate Amharic speech audio with selectable male/female voice."""
    _load_edge_tts()

    voice_name = VOICE_MAP.get(voice_key, VOICE_MAP["male"])
    return asyncio.run(_synthesize_edge_tts(text=text, voice_name=voice_name))
