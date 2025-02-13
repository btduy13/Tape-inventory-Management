from setuptools import setup, find_packages

setup(
    name="tape-inventory-management",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        'sqlalchemy',
        'alembic',
        'ttkthemes',
        'pillow',
        'reportlab',
        'pandas',
        'matplotlib',
        'seaborn',
        'openpyxl',
        'tkcalendar',
        'schedule'
    ],
    entry_points={
        'console_scripts': [
            'tape-inventory=main:main',
        ],
    },
    author="Your Name",
    description="Tape Inventory Management System",
    python_requires='>=3.8',
) 