import tkinter as tk
from tkinter import ttk
from .config import UI_STYLES, UI_PADDING

def apply_modern_style(root):
    """Apply modern dashboard styling based on the reference image"""
    style = ttk.Style(root)
    
    # Configure colors - Flat simple Palette
    COLORS = {
        'primary': '#14b8a6',       
        'secondary': '#64748b',     
        'success': '#22c55e',       
        'warning': '#f59e0b',       
        'danger': '#ef4444',        
        'background': '#ffffff',    # Flat white
        'sidebar': '#ffffff',       
        'card': '#ffffff',          
        'accent_pink': '#f472b6',
        'accent_purple': '#a855f7',
        'text': '#000000',          # Black text
        'text_light': '#000000',    # Black text
        'hover': '#f1f5f9'
    }
    
    # Configure fonts - Modern Clean Typography
    FONTS = {
        'header': ('Segoe UI Semibold', 20),
        'subheader': ('Segoe UI Semibold', 14),
        'normal': ('Segoe UI', 11),
        'bold': ('Segoe UI Bold', 11),
        'small': ('Segoe UI', 9)
    }
    
    # Base Frame Style
    style.configure('TFrame', background=COLORS['background'])
    
    # Sidebar Style
    style.configure('Sidebar.TFrame', background=COLORS['sidebar'])
    style.configure('SidebarItem.TLabel',
                   background=COLORS['sidebar'],
                   foreground=COLORS['text_light'],
                   font=FONTS['normal'],
                   padding=(20, 10))
    
    style.configure('SidebarActive.TLabel',
                   background=COLORS['hover'],
                   foreground=COLORS['primary'],
                   font=FONTS['bold'],
                   padding=(20, 10))

    # Card Style
    style.configure('Card.TFrame', 
                   background=COLORS['card'],
                   relief='flat')
                   
    # LabelFrame styling
    style.configure('TLabelframe', background=COLORS['background'], relief='flat', borderwidth=0)
    style.configure('TLabelframe.Label', 
                   background=COLORS['background'], 
                   foreground=COLORS['text'], 
                   font=FONTS['bold'])
    
    # Modern Labels
    style.configure('TLabel', 
                   background=COLORS['background'],
                   font=FONTS['normal'],
                   foreground=COLORS['text'])
    
    style.configure('Header.TLabel',
                   font=FONTS['header'],
                   foreground=COLORS['text'],
                   padding=(0, 0, 0, 5),
                   background=COLORS['background'])
    
    style.configure('Subheader.TLabel',
                   font=FONTS['normal'],
                   foreground=COLORS['text'],
                   padding=(0, 0, 0, 20),
                   background=COLORS['background'])

    style.configure('Form.TLabel', 
                   background=COLORS['background'],
                   font=FONTS['normal'],
                   foreground=COLORS['text'])
    
    style.configure('FormLight.TLabel', 
                   background=COLORS['background'],
                   font=FONTS['small'],
                   foreground=COLORS['text'])
    
    style.configure('DashboardValue.TLabel',
                   font=('Segoe UI Bold', 24),
                   foreground=COLORS['text'])

    # Entry fields
    style.configure('TEntry',
                   fieldbackground='#ffffff',
                   padding=8,
                   relief='flat')
                   
    style.configure('Modern.TEntry',
                   fieldbackground='#f8fafc',
                   padding=8,
                   bordercolor='#e2e8f0',
                   lightcolor='#e2e8f0',
                   darkcolor='#e2e8f0',
                   borderwidth=1,
                   relief='solid')
    
    # Buttons
    style.configure('TButton',
                   font=FONTS['bold'],
                   padding=(15, 8),
                   borderwidth=0)
    
    style.configure('Primary.TButton',
                   background=COLORS['primary'],
                   foreground='white')
    
    # Custom map for button hover
    style.map('Primary.TButton',
             background=[('active', '#0d9488')])

    # Treeview (for tables/lists)
    style.configure('Treeview',
                   background=COLORS['card'],
                   fieldbackground=COLORS['card'],
                   font=FONTS['normal'],
                   rowheight=35,
                   borderwidth=0)
    
    style.configure('Treeview.Heading',
                   background='#f8fafc',
                   font=FONTS['bold'],
                   foreground=COLORS['secondary'],
                   relief='flat')
    
    style.map('Treeview',
             background=[('selected', COLORS['primary'])],
             foreground=[('selected', 'white')])
    
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