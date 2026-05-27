#!/usr/bin/env python3
"""Insert inline module that imports index.js (bypassing src= issue)"""
from pathlib import Path

DIST = Path('dist/renderer/renderer')
html_path = DIST / 'index.html'

html = html_path.read_text()
# The inline module imports index.js which in turn imports all other modules
# This works because inline module imports resolve correctly!
bundled = '<script type="module">import "./index.js";</script>'
html = html.replace('<!-- MODULE_PLACEHOLDER -->', bundled)
html_path.write_text(html)
print(f'Added inline module import to {html_path}')
