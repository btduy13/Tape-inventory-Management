# tab_base.py
import tkinter as tk
from tkinter import ttk
import os

class TabBase:
    def __init__(self, parent_form):
        self.parent_form = parent_form  # Reference to DonHangForm
        self.root = parent_form.root
        # Khởi tạo các biến trạng thái mặc định
        self.da_giao = False
        self.da_tat_toan = False

    def parse_float(self, value):
        """Chuyển đổi chuỗi số có dấu phẩy thành float"""
        if not value:
            return 0.0
        try:
            # Xóa dấu phẩy ngăn cách hàng nghìn
            cleaned_value = value.replace(',', '')
            return float(cleaned_value)
        except ValueError:
            return 0.0

    def validate_float_input(self, value):
        """Convert string input to float, handling currency formatting"""
        if value == "":
            return 0.0
        try:
            # Remove currency formatting (commas)
            cleaned_value = value.replace(',', '')
            return float(cleaned_value)
        except ValueError:
            return 0.0

    def format_currency(self, value):
        return f"{value:,.0f}"

    def update_readonly_field(self, field, value):
        """Update the value of a readonly field and highlight it."""
        field.configure(state='normal')
        field.delete(0, tk.END)
        field.insert(0, self.format_currency(value))
        original_color = field.cget('background')
        field.configure(background='yellow')  # Highlight color
        field.after(1500, lambda: field.configure(background=original_color))  # Revert color after 1.5 seconds
        field.configure(state='readonly')

    def update_status(self, message):
        self.parent_form.update_status(message)

    def clear_widget(self, widget):
        if isinstance(widget, tk.Entry) or isinstance(widget, ttk.Entry):
            if widget.cget('state') != 'readonly':
                widget.delete(0, tk.END)
        elif hasattr(widget, 'winfo_children'):
            for child in widget.winfo_children():
                self.clear_widget(child)

    def format_currency_input(self, event):
        """Format the input as currency while typing"""
        widget = event.widget
        if widget.get() == "":
            return

        try:
            # Remove existing formatting
            current = widget.get().replace(',', '')
            if not current:
                return

            # Convert to float and format
            value = float(current)
            formatted = f"{value:,.0f}"

            # Update entry widget
            current_cursor = widget.index(tk.INSERT)  # Save cursor position
            widget.delete(0, tk.END)
            widget.insert(0, formatted)

            # Adjust cursor position based on added commas
            commas_added = formatted.count(',') - current.count(',')
            new_cursor_position = current_cursor + commas_added
            widget.icursor(new_cursor_position)  # Restore cursor position

        except ValueError:
            # If conversion fails, leave the input as is
            pass

    def create_button(self, parent, text, command, image=None):
        button = ttk.Button(parent, text=text, command=command, image=image, compound=tk.LEFT)
        return button

    def add_tooltip(self, widget, text):
        tooltip = tk.Toplevel(widget)
        tooltip.withdraw()
        tooltip.overrideredirect(True)
        label = ttk.Label(tooltip, text=text, background='white', relief='solid', borderwidth=1)
        label.pack()

        def show_tooltip(event):
            x = event.widget.winfo_rootx() + event.widget.winfo_width()
            y = event.widget.winfo_rooty()
            tooltip.geometry(f"+{x}+{y}")
            tooltip.deiconify()

        def hide_tooltip(event):
            tooltip.withdraw()

        widget.bind('<Enter>', show_tooltip)
        widget.bind('<Leave>', hide_tooltip)

    def is_valid_float(self, value_if_allowed):
        if value_if_allowed == "":
            return True
        try:
            float(value_if_allowed.replace(',', ''))
            return True
        except ValueError:
            return False

    def lam_moi(self):
        """Reset form về trạng thái ban đầu"""
        self.da_giao = False
        self.da_tat_toan = False