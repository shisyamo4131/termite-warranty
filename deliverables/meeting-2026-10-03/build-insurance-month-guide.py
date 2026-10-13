"""Compatibility entry point for the current consolidated post-presentation guide."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name('build-post-presentation-guide.py')), run_name='__main__')
