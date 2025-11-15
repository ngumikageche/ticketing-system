"""Routes package for the application.

Each module here exposes a Blueprint named <resource>_bp which is imported
by the application factory in `app.__init__` if present.
"""

from flask import Blueprint

# package marker
