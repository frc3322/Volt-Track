from __future__ import annotations

from flask import Flask, jsonify

from .repository import flask_counts


flask_app = Flask(__name__)


@flask_app.get("/healthz")
def healthz():
    return jsonify({"status": "ok", "framework": "flask"})


@flask_app.get("/counts")
def counts():
    return jsonify(flask_counts())
