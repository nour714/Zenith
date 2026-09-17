"""
Centralized logging configuration.
"""
import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """Configures root logger with formatted stream handler."""
    if sys.platform == "win32":
        reconfig_out = getattr(sys.stdout, "reconfigure", None)
        if callable(reconfig_out):
            try:
                reconfig_out(encoding="utf-8", errors="replace")
            except Exception:
                pass
        reconfig_err = getattr(sys.stderr, "reconfigure", None)
        if callable(reconfig_err):
            try:
                reconfig_err(encoding="utf-8", errors="replace")
            except Exception:
                pass

    log_format = "[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"
    
    logging.basicConfig(
        level=level,
        format=log_format,
        datefmt=date_format,
        handlers=[logging.StreamHandler(sys.stdout)]
    )


def get_logger(name: str) -> logging.Logger:
    """Retrieves a named logger instance."""
    return logging.getLogger(name)
