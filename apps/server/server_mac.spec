# -*- mode: python ; coding: utf-8 -*-

a = Analysis(
    ['start.py'],
    pathex=[],
    binaries=[],
    datas=[],
    hiddenimports=[
        # uvicorn dynamic imports
        'uvicorn.logging',
        'uvicorn.loops.auto',
        'uvicorn.loops.asyncio',
        'uvicorn.protocols.http.auto',
        'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.http.httptools_impl',
        'uvicorn.protocols.websockets.auto',
        'uvicorn.protocols.websockets.wsproto_impl',
        'uvicorn.protocols.websockets.websockets_impl',
        'uvicorn.lifespan.on',
        'uvicorn.lifespan.off',
        # SQLAlchemy SQLite dialect
        'sqlalchemy.dialects.sqlite',
        'sqlalchemy.dialects.sqlite.pysqlite',
        # apscheduler
        'apscheduler.schedulers.background',
        'apscheduler.jobstores.memory',
        'apscheduler.executors.pool',
        'apscheduler.triggers.interval',
        'apscheduler.triggers.date',
        # keyring macOS backend
        'keyring.backends',
        'keyring.backends.macOS',
        'keyring.backends.fail',
        # pydantic
        'pydantic_core',
        'pydantic.networks',
        'pydantic_settings',
        # stdlib http (used by ollama proxy)
        'http.server',
        'http.client',
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='server',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
