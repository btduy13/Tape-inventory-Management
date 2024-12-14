import tkinter as tk
from tkinter import ttk
from datetime import datetime

class HistoryUtils:
    @staticmethod
    def create_tooltip(widget, text):
        def show_tooltip(event):
            tooltip = tk.Toplevel()
            tooltip.wm_overrideredirect(True)
            tooltip.wm_geometry(f"+{event.x_root+10}+{event.y_root+10}")
            
            label = ttk.Label(tooltip, text=text, background="#ffffe0", relief=tk.SOLID, borderwidth=1)
            label.pack()
            
            def hide_tooltip():
                tooltip.destroy()
            
            widget.tooltip = tooltip
            widget.bind('<Leave>', lambda e: hide_tooltip())
            tooltip.bind('<Leave>', lambda e: hide_tooltip())
        
        widget.bind('<Enter>', show_tooltip)
        
    @staticmethod
    def format_currency(value):
        try:
            if value is None or value == '':
                return ''
            return f"{float(value):,.0f}"
        except (ValueError, TypeError):
            return str(value)
            
    @staticmethod
    def validate_float_input(value):
        try:
            if isinstance(value, str):
                value = value.replace(',', '')
            return float(value)
        except (ValueError, TypeError):
            return 0.0
            
    @staticmethod
    def parse_date_string(date_string, date_format='%d/%m/%Y', datetime_format='%d/%m/%Y %H:%M:%S'):
        try:
            if ' ' in date_string:
                return datetime.strptime(date_string, datetime_format)
            return datetime.strptime(date_string, date_format)
        except ValueError as e:
            logging.error(f"Date parsing error: {str(e)}")
            return None 