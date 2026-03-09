# Runtime hook for psycopg2 in PyInstaller frozen environments
# This ensures psycopg2's binary extension can be found and loaded.

import sys
import os

# When frozen by PyInstaller, _MEIPASS is set to the temp unpacking dir
if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
    # Add the psycopg2 directory explicitly so the C extension (_psycopg*.pyd)
    # can be discovered by the import machinery
    psycopg2_path = os.path.join(sys._MEIPASS, 'psycopg2')
    if psycopg2_path not in sys.path:
        sys.path.insert(0, psycopg2_path)
    
    # Also add the _internal directory for onedir builds
    # The _MEIPASS already points there, but belt-and-suspenders:
    parent = os.path.dirname(sys._MEIPASS)
    internal_psycopg2 = os.path.join(parent, '_internal', 'psycopg2')
    if os.path.isdir(internal_psycopg2) and internal_psycopg2 not in sys.path:
        sys.path.insert(0, internal_psycopg2)
