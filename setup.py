from setuptools import setup, find_packages

setup(
    name="TapeInventoryManagement",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        'ttkthemes',
        'sqlalchemy',
        'psycopg2-binary',
        'pillow',
        'pandas',
        'openpyxl',
        'reportlab',
        'babel',
        # Thêm các dependency khác của dự án vào đây
    ],
    python_requires='>=3.8',
) 