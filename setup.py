from setuptools import setup, find_packages

setup(
    name="quanlydonhang",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        'ttkthemes',
        'pillow',
        'sqlalchemy',
        'openpyxl',
        'babel',
    ],
    python_requires='>=3.8',
) 