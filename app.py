from flask import Flask, request, render_template, send_file
import io
import base64
from tools.ocr.ocr import extract_amharic_text_from_bytes

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("home.html")


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


@app.route("/Games/Amharic_Hangman_Game")
def amharic_hangman_game():
    return render_template("game_hangman.html")


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
