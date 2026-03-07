import tkinter as tk
from tkinter import ttk

class ModernCard(tk.Frame):
    """A card-like component with modern styling for displaying metrics"""
    def __init__(self, master, title, value, icon="", subtitle="", accent_color="#14b8a6", **kwargs):
        # We use a tk.Frame as the base to allow for custom background colors easily
        super().__init__(master, **kwargs)
        
        self.COLORS = master.master.COLORS if hasattr(master.master, 'COLORS') else {
            'card': '#ffffff',
            'text': '#0f172a',
            'text_light': '#64748b',
            'primary': '#14b8a6'
        }
        
        self.configure(background=self.COLORS['card'], padx=20, pady=20)
        
        # Icon/Symbol and Title row
        header_frame = tk.Frame(self, background=self.COLORS['card'])
        header_frame.pack(fill=tk.X)
        
        if icon:
            self.icon_label = tk.Label(
                header_frame, text=icon, 
                font=('Segoe UI', 18),
                background=self.COLORS['card'],
                foreground=accent_color
            )
            self.icon_label.pack(side=tk.LEFT)
            
        self.title_label = tk.Label(
            header_frame, text=f"  {title.upper()}", 
            font=('Segoe UI Semibold', 9),
            background=self.COLORS['card'],
            foreground=self.COLORS['text_light']
        )
        self.title_label.pack(side=tk.LEFT, pady=(5, 0))
        
        # Value row
        self.value_label = tk.Label(
            self, text=value, 
            font=('Segoe UI Bold', 24),
            background=self.COLORS['card'],
            foreground=self.COLORS['text'],
            pady=10
        )
        self.value_label.pack(anchor='w')
        
        # Subtitle/Trend row
        if subtitle:
            self.subtitle_label = tk.Label(
                self, text=subtitle, 
                font=('Segoe UI', 10),
                background=self.COLORS['card'],
                foreground=self.COLORS['text_light']
            )
            self.subtitle_label.pack(anchor='w')

    def set_value(self, value):
        self.value_label.configure(text=value)

    def set_subtitle(self, subtitle):
        self.subtitle_label.configure(text=subtitle)
