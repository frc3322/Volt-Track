from __future__ import annotations

import argparse
import os
import signal

import uvicorn

from backend.app.main import app


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the VoltTrack desktop backend.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    parser.add_argument("--log-level", default="warning")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.environ.setdefault("BATTERY_TRACKER_APP_ENV", "desktop")

    server = uvicorn.Server(
        uvicorn.Config(
            app,
            host=args.host,
            port=args.port,
            log_level=args.log_level,
            access_log=False,
        )
    )

    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, lambda *_: setattr(server, "should_exit", True))

    server.run()


if __name__ == "__main__":
    main()
