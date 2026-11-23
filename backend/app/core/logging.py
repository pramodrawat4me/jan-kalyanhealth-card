import logging
import sys


def configure_logging(environment: str) -> None:
    """Configure a single structured stream handler for the whole app.

    Kept deliberately simple (stdlib logging, no extra dependency) — in
    production this stream is expected to be captured by the process
    supervisor / container log driver.
    """

    level = logging.INFO if environment.lower() == "production" else logging.DEBUG

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        logging.Formatter(
            fmt="%(asctime)s %(levelname)s %(name)s :: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )

    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]

    # Quiet noisy third-party loggers unless we are debugging.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING if environment == "production" else logging.INFO)
