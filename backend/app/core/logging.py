"""
Centralized logging configuration.
"""
import logging
import sys


def setup_logging(level: int = logging.INFO) -> None:
    """Configures root logger with formatted stream handler."""
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
