"""Whitelist package files; never includes browser profiles, logs or output screenshots."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

ROOT = Path(__file__).resolve().parents[1]
VERSION = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
OUT = ROOT.parent / '交付'

def main():
    OUT.mkdir(exist_ok=True)
    common = ['index.html', 'style.css', 'README.md', '启动游戏.bat']
    common += [p.relative_to(ROOT).as_posix() for folder in ['src', 'assets'] for p in (ROOT / folder).rglob('*') if p.is_file()]
    common += ['docs/TECHNICAL.md', 'docs/CONFIG.md', 'docs/ASSETS.md', 'tools/serve.cjs']
    extra = ['package.json', '.gitignore', 'docs/IMPLEMENTATION.md']
    extra += [p.relative_to(ROOT).as_posix() for folder in ['tests', 'tools'] for p in (ROOT / folder).glob('*') if p.is_file()]
    for label, files in [('网页版运行包', common), ('完整源码', common + extra)]:
        target = OUT / f'三芒星-{label}-v{VERSION}.zip'
        with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=9) as archive:
            for filename in sorted(set(files)):
                archive.write(ROOT / filename, f'ThreeStar-Web/{filename}')
        with ZipFile(target) as archive:
            assert archive.testzip() is None
            print(f'{target} ({len(archive.namelist())} files, {target.stat().st_size:,} bytes)')

if __name__ == '__main__':
    main()
