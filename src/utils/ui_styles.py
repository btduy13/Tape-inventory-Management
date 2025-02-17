import tkinter as tk
from tkinter import ttk
from .config import UI_STYLES, UI_PADDING

def apply_modern_style(root):
    """Apply modern styling to the application"""
    style = ttk.Style(root)
    
    # Configure colors
    COLORS = {
        'primary': '#2196F3',      # Blue
        'secondary': '#757575',    # Gray
        'success': '#4CAF50',      # Green
        'warning': '#FFC107',      # Yellow
        'danger': '#F44336',       # Red
        'background': '#FFFFFF',   # White
        'text': '#212121',        # Dark Gray
        'light_bg': '#F5F5F5'     # Light Gray
    }
    
    # Configure fonts
    FONTS = {
        'header': ('Segoe UI', 16, 'bold'),
        'subheader': ('Segoe UI', 12, 'bold'),
        'normal': ('Segoe UI', 10),
        'small': ('Segoe UI', 9)
    }
    
    # Configure common styles
    style.configure('TFrame', background=COLORS['background'])
    style.configure('TLabel', 
                   background=COLORS['background'],
                   font=FONTS['normal'],
                   foreground=COLORS['text'])
    
    # Header style
    style.configure('Header.TLabel',
                   font=FONTS['header'],
                   foreground=COLORS['primary'],
                   padding=10)
    
    # Subheader style
    style.configure('Subheader.TLabel',
                   font=FONTS['subheader'],
                   foreground=COLORS['secondary'],
                   padding=5)
    
    # Entry fields
    style.configure('TEntry',
                   fieldbackground=COLORS['light_bg'],
                   padding=5,
                   font=FONTS['normal'])
    
    # Buttons
    style.configure('TButton',
                   font=FONTS['normal'],
                   padding=10)
    
    # Primary button
    style.configure('Primary.TButton',
                   background=COLORS['primary'],
                   foreground='white')
    
    # Success button
    style.configure('Success.TButton',
                   background=COLORS['success'],
                   foreground='white')
    
    # Warning button
    style.configure('Warning.TButton',
                   background=COLORS['warning'],
                   foreground='black')
    
    # Danger button
    style.configure('Danger.TButton',
                   background=COLORS['danger'],
                   foreground='white')
    
    # Notebook (tabs)
    style.configure('TNotebook',
                   background=COLORS['background'],
                   tabmargins=[2, 5, 2, 0])
    
    style.configure('TNotebook.Tab',
                   background=COLORS['background'],
                   padding=[15, 5],
                   font=('Segoe UI', -12),  # Negative size for auto-scaling
                   borderwidth=0,
                   foreground=COLORS['text'])
    
    # Selected tab
    style.map('TNotebook.Tab',
             background=[('selected', COLORS['background']),
                        ('active', '#E8E8E8')],
             foreground=[('selected', COLORS['primary']),
                        ('active', COLORS['primary'])],
             borderwidth=[('selected', 0)],
             font=[('selected', ('Segoe UI', -12, 'bold'))],  # Negative size for auto-scaling
             padding=[('selected', [15, 5])])
    
    # Treeview (for tables/lists)
    style.configure('Treeview',
                   background=COLORS['background'],
                   fieldbackground=COLORS['background'],
                   font=FONTS['normal'],
                   rowheight=30)
    
    style.configure('Treeview.Heading',
                   background=COLORS['light_bg'],
                   font=FONTS['subheader'])
    
    style.map('Treeview',
             background=[('selected', COLORS['primary'])],
             foreground=[('selected', 'white')])
    
    # LabelFrame
    style.configure('TLabelframe',
                   background=COLORS['background'],
                   font=FONTS['subheader'])
    
    style.configure('TLabelframe.Label',
                   background=COLORS['background'],
                   font=FONTS['subheader'],
                   foreground=COLORS['primary'])
    
    return COLORS, FONTS

class ModernButton(ttk.Button):
    """Custom button with hover effect"""
    def __init__(self, master=None, **kwargs):
        super().__init__(master, style='Modern.TButton', **kwargs)
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)
    
    def _on_enter(self, e):
        self.state(['active'])
    
    def _on_leave(self, e):
        self.state(['!active'])

class ModernEntry(ttk.Entry):
    """Custom entry with placeholder text support"""
    def __init__(self, master=None, placeholder="", **kwargs):
        super().__init__(master, style='Modern.TEntry', **kwargs)
        self.placeholder = placeholder
        self.placeholder_color = UI_STYLES['colors']['text_secondary']
        self.default_fg = UI_STYLES['colors']['text']
        
        self.bind("<FocusIn>", self._clear_placeholder)
        self.bind("<FocusOut>", self._add_placeholder)
        
        self._add_placeholder()
    
    def _clear_placeholder(self, e=None):
        if self.get() == self.placeholder:
            self.delete(0, tk.END)
            self.configure(foreground=self.default_fg)
    
    def _add_placeholder(self, e=None):
        if not self.get():
            self.insert(0, self.placeholder)
            self.configure(foreground=self.placeholder_color)

def create_tooltip(widget, text):
    """Create a modern tooltip for a widget"""
    tooltip = tk.Label(widget.master, 
        text=text,
        background=UI_STYLES['colors']['secondary'],
        foreground=UI_STYLES['colors']['text'],
        relief='solid',
        borderwidth=1,
        font=UI_STYLES['font'])
    tooltip.place_forget()
    
    def enter(event):
        tooltip.lift()
        tooltip.place(x=widget.winfo_rootx() - widget.winfo_x() + 10,
                     y=widget.winfo_rooty() - widget.winfo_y() + widget.winfo_height() + 5)
    
    def leave(event):
        tooltip.place_forget()
    
    widget.bind('<Enter>', enter)
    widget.bind('<Leave>', leave)
    
    return tooltip 