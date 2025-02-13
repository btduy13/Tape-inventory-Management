import tkinter as tk
from tkinter import ttk
from .config import UI_STYLES, UI_PADDING

def apply_modern_style(root):
    """Apply modern styling to the root window and its widgets"""
    style = ttk.Style(root)
    
    # Configure common styles
    style.configure('.',
        font=UI_STYLES['font']
    )
    
    # Modern Button style
    style.configure('Modern.TButton',
        background=UI_STYLES['button']['background'],
        foreground=UI_STYLES['button']['foreground'],
        padding=(UI_STYLES['button']['padx'], UI_STYLES['button']['pady']),
        font=UI_STYLES['button']['font']
    )
    style.map('Modern.TButton',
        background=[('active', UI_STYLES['button']['activebackground'])],
        foreground=[('active', UI_STYLES['button']['activeforeground'])]
    )
    
    # Entry style
    style.configure('Modern.TEntry',
        fieldbackground='white',
        padding=UI_PADDING['small']
    )
    
    # Treeview style
    style.configure('Modern.Treeview',
        background=UI_STYLES['treeview']['background'],
        fieldbackground=UI_STYLES['treeview']['fieldbackground'],
        font=UI_STYLES['treeview']['font'],
        rowheight=UI_STYLES['treeview']['rowheight']
    )
    style.configure('Modern.Treeview.Heading',
        font=UI_STYLES['heading_font'],
        background=UI_STYLES['colors']['secondary']
    )
    
    # Frame style
    style.configure('Modern.TFrame',
        background='white'
    )
    
    # Label style
    style.configure('Modern.TLabel',
        background='white',
        font=UI_STYLES['font']
    )
    
    # Heading label style
    style.configure('Heading.TLabel',
        font=UI_STYLES['heading_font'],
        foreground=UI_STYLES['colors']['text']
    )

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