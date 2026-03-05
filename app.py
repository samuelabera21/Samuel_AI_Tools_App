from flask import Flask, request, render_template, send_file, jsonify
import io
import base64
from decimal import Decimal, InvalidOperation
from gtts import gTTS
from tools.ocr.ocr import extract_amharic_text_from_bytes
from tools.amharic_numbers_converter.converter import number_to_amharic, number_to_currency
from tools.geez_numbers_converter.converter import arabic_to_geez, geez_to_arabic
from tools.amharic_text_to_image.generator import generate_image_from_prompt
from tools.amharic_keyboard.assistant import polish_amharic_text
from tools.amharic_text_to_speech.service import synthesize_amharic_speech
from tools.random_amharic_words_generator.service import (
    generate_random_amharic_words,
    get_prefix_options,
)

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("home.html")


@app.route("/Tools/Amharic_AI_Prompt_to_Image_Generator")
@app.route("/Tools/Amharic_to_Image")
def amharic_ai_prompt_to_image_generator():
    return render_template("amharic_ai_image_generator.html")


@app.route("/Tools/Free_Amharic_Keyboard")
@app.route("/Tools/Amharic_Keyboard")
def free_amharic_keyboard():
    return render_template("amharic_keyboard.html")


@app.route("/Tools/Amharic_Text_To_Speech")
@app.route("/Tools/Amharic_Text_to_Speech")
def amharic_text_to_speech_page():
    return render_template("amharic_text_to_speech.html")


@app.route("/Tools/Amharic_Words_Generator")
@app.route("/Tools/Random_Amharic_Words_Generator")
def amharic_words_generator_page():
    return render_template("amharic_words_generator.html", prefix_options=get_prefix_options())


@app.route("/Tools/Amharic_OCR", methods=["GET", "POST"])
def amharic_ocr():
    text = ""
    image_url = ""

    if request.method == "POST":
        file = request.files.get("image")
        if file and file.filename:
            image_bytes = file.read()
            text = extract_amharic_text_from_bytes(image_bytes, lang="amh")

            mime_type = file.mimetype or "image/png"
            encoded = base64.b64encode(image_bytes).decode("utf-8")
            image_url = f"data:{mime_type};base64,{encoded}"

    return render_template("ocr.html", text=text, image_url=image_url)


@app.route("/Tools/Numbers_to_Amharic_Words_Converter", methods=["GET", "POST"])
@app.route("/Tools/Amharic_Numbers_Converter", methods=["GET", "POST"])
def amharic_numbers_converter():
    # `result` stores the converted Amharic text shown in the result card.
    result = ""
    number_value = "0"
    mode = "normal"

    if request.method == "POST":
        number_value = request.form.get("number", "0").strip() or "0"
        normalized_value = number_value.replace(",", "")
        mode = request.form.get("mode", "normal")

        try:
            if mode == "currency":
                amount = Decimal(normalized_value)
                result = number_to_currency(amount)
            else:
                if "." in normalized_value:
                    raise ValueError
                number = int(normalized_value)
                result = number_to_amharic(number)
        except (ValueError, InvalidOperation):
            result = "እባክዎ ትክክለኛ ቁጥር ያስገቡ"

    return render_template(
        "amharic_numbers.html",
        result=result,
        number_value=number_value,
        mode=mode,
    )


@app.route("/Tools/Geez_Numbers_Converter", methods=["GET", "POST"])
def geez_numbers_converter():
    mode = "to_geez"
    value = ""
    result = ""
    error = ""

    handler = request.args.get("handler", "").strip()
    if handler == "ToArabicNumerals":
        mode = "from_geez"
    elif handler == "ToGeez":
        mode = "to_geez"

    if request.method == "POST":
        mode = request.form.get("mode", mode)
        value = request.form.get("value", "").strip()

        try:
            if mode == "to_geez":
                normalized = value.replace(",", "")
                if not normalized or "." in normalized:
                    raise ValueError

                number = int(normalized)
                result = arabic_to_geez(number)
            else:
                result = str(geez_to_arabic(value))
        except ValueError:
            if mode == "to_geez":
                error = "Please enter a valid positive whole number."
            else:
                error = "Please enter a valid Geez numeral."

    return render_template(
        "geez_numbers.html",
        mode=mode,
        value=value,
        result=result,
        error=error,
    )


@app.route("/Tools/Ethiopia_Phone_Numbers")
def ethiopian_phone_number_validator():
    return render_template("ethiopian_phone_numbers.html")


@app.route("/Tools/Numbers_to_Amharic_Words_Converter/speak", methods=["POST"])
def speak_amharic_numbers_text():
    # Receive the text to speak from the page.
    payload = request.get_json(silent=True) or {}
    text_to_speak = str(payload.get("text", "")).strip()

    if not text_to_speak:
        return jsonify({"error": "No text provided for speech."}), 400

    try:
        # Generate MP3 audio in memory (no temp file on disk).
        audio_buffer = io.BytesIO()
        tts = gTTS(text=text_to_speak, lang="am")
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)

        # Stream the generated audio directly to the browser.
        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="amharic_numbers.mp3",
        )
    except Exception:
        return jsonify({"error": "Audio generation failed. Please try again."}), 500


@app.route("/Games/Amharic_Hangman_Game")
def amharic_hangman_game():
    return render_template("game_hangman.html")


@app.route("/api/amharic-ai-image", methods=["POST"])
def amharic_ai_image_api():
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt", "")).strip()
    size = str(payload.get("size", "1024x1024")).strip() or "1024x1024"
    style = str(payload.get("style", "")).strip() or None

    if not prompt:
        return jsonify({"error": "Prompt is required."}), 400

    allowed_sizes = {"1024x1024"}
    if size not in allowed_sizes:
        return jsonify({"error": "Currently supported image size is 1024x1024."}), 400

    try:
        generated = generate_image_from_prompt(prompt=prompt, size=size, style=style)
        return jsonify({"imageUrl": generated["image_url"]})
    except RuntimeError:
        return jsonify({"error": "Server is missing NVIDIA_API_KEY configuration."}), 500
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        return jsonify({"error": "Unexpected server error while generating image."}), 500


@app.route("/api/amharic-keyboard/ai-polish", methods=["POST"])
def amharic_keyboard_ai_polish_api():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()

    if not text:
        return jsonify({"error": "Text is required."}), 400

    try:
        polished = polish_amharic_text(text)
        return jsonify({"text": polished})
    except RuntimeError:
        return jsonify({"error": "Server is missing NVIDIA_API_KEY configuration."}), 500
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        return jsonify({"error": "Unexpected server error while polishing text."}), 500


@app.route("/api/amharic-text-to-speech", methods=["POST"])
def amharic_text_to_speech_api():
    payload = request.get_json(silent=True) or {}
    text = str(payload.get("text", "")).strip()
    voice = str(payload.get("voice", "male")).strip().lower()

    if not text:
        return jsonify({"error": "Text is required."}), 400

    if voice not in {"male", "female"}:
        return jsonify({"error": "Unsupported voice option."}), 400

    try:
        audio_buffer = synthesize_amharic_speech(text=text, voice_key=voice)
        return send_file(
            audio_buffer,
            mimetype="audio/mpeg",
            as_attachment=False,
            download_name="amharic_text_to_speech.mp3",
        )
    except RuntimeError as exc:
        return jsonify({"error": str(exc)}), 500
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 502
    except Exception:
        return jsonify({"error": "Unexpected server error while generating speech."}), 500


@app.route("/api/amharic-words-generator", methods=["POST"])
def amharic_words_generator_api():
    payload = request.get_json(silent=True) or {}
    count = payload.get("count", 10)
    prefix = str(payload.get("prefix", "any")).strip() or "any"
    order = str(payload.get("order", "random")).strip().lower() or "random"

    try:
        count = int(count)
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid word count value."}), 400

    try:
        words = generate_random_amharic_words(count=count, prefix_key=prefix, order=order)
        return jsonify({"words": words})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception:
        return jsonify({"error": "Unexpected server error while generating words."}), 500


@app.route("/download", methods=["POST"])
def download_text():
    text = request.form.get("text", "")
    buffer = io.BytesIO(text.encode("utf-8"))
    buffer.seek(0)
    return send_file(
        buffer,
        as_attachment=True,
        download_name="ocr_result.txt",
        mimetype="text/plain",
    )

if __name__ == "__main__":
    app.run(debug=True)
