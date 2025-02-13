# splash_screen.py
import tkinter as tk
from tkinter import ttk
import time
from src.utils.config import APP_NAME, UI_STYLES, ICON_PNG

class ModernProgressBar(ttk.Progressbar):
    """Custom progress bar with smooth animation"""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._smooth_value = 0.0
        
    def smooth_set(self, target_value):
        """Smoothly animate to target value"""
        if abs(self._smooth_value - target_value) > 0.01:
            # Smooth animation
            self._smooth_value += (target_value - self._smooth_value) * 0.15
            self['value'] = self._smooth_value
            self.after(16, lambda: self.smooth_set(target_value))

class GradientText(tk.Canvas):
    """Custom canvas widget for gradient text"""
    def __init__(self, parent, text, font, gradient_colors, *args, **kwargs):
        super().__init__(parent, *args, **kwargs)
        self.configure(background='white', highlightthickness=0)
        
        # Create text
        self.text = text
        self.font = font
        self.gradient_colors = gradient_colors
        
        # Calculate text size
        test_label = ttk.Label(self, text=text, font=font)
        test_label.update()
        self.text_width = test_label.winfo_reqwidth()
        self.text_height = test_label.winfo_reqheight()
        test_label.destroy()
        
        # Set canvas size
        self.configure(width=self.text_width, height=self.text_height)
        
        # Create gradient text
        self.create_gradient_text()
    
    def create_gradient_text(self):
        """Create text with gradient effect"""
        # Create text shadow for depth
        shadow_offset = 2
        self.create_text(
            self.text_width/2 + shadow_offset,
            self.text_height/2 + shadow_offset,
            text=self.text,
            font=self.font,
            fill='#E0E0E0'
        )
        
        # Create main text
        self.text_id = self.create_text(
            self.text_width/2,
            self.text_height/2,
            text=self.text,
            font=self.font,
            fill=self.gradient_colors[0]
        )
        
        # Animate gradient
        self.gradient_index = 0
        self.animate_gradient()
    
    def animate_gradient(self):
        """Animate gradient colors"""
        self.gradient_index = (self.gradient_index + 1) % len(self.gradient_colors)
        next_color = self.gradient_colors[self.gradient_index]
        
        self.itemconfig(self.text_id, fill=next_color)
        self.after(1000, self.animate_gradient)  # Reduced from 2000ms to 1000ms

class SplashScreen(tk.Toplevel):
    def __init__(self, parent):
        super().__init__(parent)
        
        # Window setup
        self.overrideredirect(True)
        self.configure(background=UI_STYLES['colors']['primary'])
        self.attributes('-alpha', 0.0)  # Start fully transparent
        
        # Make window corners rounded (if supported)
        try:
            self.attributes('-transparentcolor', UI_STYLES['colors']['primary'])
        except:
            pass
        
        # Center splash screen
        width = 400  # Reduced from 500
        height = 300  # Reduced from 350
        screen_width = self.winfo_screenwidth()
        screen_height = self.winfo_screenheight()
        x = (screen_width - width) // 2
        y = (screen_height - height) // 2
        self.geometry(f"{width}x{height}+{x}+{y}")
        
        # Create main frame with modern design
        self.main_frame = ttk.Frame(self, style='Modern.TFrame')
        self.main_frame.pack(expand=True, fill='both', padx=2, pady=2)
        
        # Create content frame with white background
        content_frame = ttk.Frame(self.main_frame, style='Content.TFrame')
        content_frame.pack(expand=True, fill='both')
        
        # App icon with fade-in effect
        try:
            self.icon_image = tk.PhotoImage(file=ICON_PNG)
            # Resize image to 96x96 (reduced from 128x128)
            self.icon_image = self.icon_image.subsample(
                max(1, self.icon_image.width() // 96),
                max(1, self.icon_image.height() // 96)
            )
            self.icon_label = ttk.Label(content_frame, image=self.icon_image, style='Content.TLabel')
            self.icon_label.pack(pady=(30, 15))  # Reduced padding
            self.icon_label.configure(background='white')
        except Exception as e:
            print(f"Failed to load icon: {e}")
        
        # App name with gradient effect
        gradient_colors = [
            UI_STYLES['colors']['primary'],
            '#1E88E5',  # Slightly lighter blue
            '#2196F3',  # Material blue
            '#1E88E5',  # Back to lighter blue
            UI_STYLES['colors']['primary']  # Back to primary
        ]
        
        self.app_name = GradientText(
            content_frame,
            text=APP_NAME,
            font=('Segoe UI', 20, 'bold'),
            gradient_colors=gradient_colors,
            height=40
        )
        self.app_name.pack(pady=(0, 15))
        
        # Progress bar container for better visual
        progress_frame = ttk.Frame(content_frame, style='Content.TFrame')
        progress_frame.pack(fill='x', padx=40)  # Reduced padding
        
        # Modern progress bar
        self.progress = ModernProgressBar(
            progress_frame,
            mode='determinate',
            length=320,  # Reduced from 400
            style='Modern.Horizontal.TProgressbar'
        )
        self.progress.pack(fill='x', pady=(0, 8))  # Reduced padding
        
        # Status label with modern font
        self.status_label = ttk.Label(
            content_frame,
            text="Khởi động hệ thống...",
            font=('Segoe UI', 10),
            foreground=UI_STYLES['colors']['text_secondary'],
            style='Content.TLabel',
            wraplength=300  # Add text wrapping
        )
        self.status_label.pack(pady=5)
        
        # Version label with subtle gradient
        version_frame = ttk.Frame(content_frame, style='Content.TFrame')
        version_frame.pack(side='bottom', fill='x', pady=10)
        
        self.version_label = GradientText(
            version_frame,
            text="Phiên bản 1.0.0",
            font=('Segoe UI', 9),
            gradient_colors=[
                UI_STYLES['colors']['text_secondary'],
                '#808080',  # Mid gray
                UI_STYLES['colors']['text_secondary']
            ],
            height=20
        )
        self.version_label.pack()
        
        # Configure modern styles
        style = ttk.Style()
        style.configure('Content.TFrame', background='white')
        style.configure('Content.TLabel', background='white')
        style.configure(
            'Modern.Horizontal.TProgressbar',
            troughcolor='#E6E6E6',
            background=UI_STYLES['colors']['primary'],
            lightcolor=UI_STYLES['colors']['primary'],
            darkcolor=UI_STYLES['colors']['primary'],
            bordercolor='#E6E6E6'
        )
        
        # Start animations
        self.progress_value = 0
        self.fade_in()
        self.animate_progress()
    
    def fade_in(self):
        """Fade in animation for splash screen"""
        alpha = self.attributes('-alpha')
        if alpha < 1.0:
            alpha += 0.2  # Increased from 0.1 to 0.2
            self.attributes('-alpha', alpha)
            self.after(10, self.fade_in)  # Reduced from 20ms to 10ms
    
    def fade_out(self):
        """Fade out animation before destroying"""
        alpha = self.attributes('-alpha')
        if alpha > 0:
            alpha -= 0.2  # Increased from 0.1 to 0.2
            self.attributes('-alpha', alpha)
            self.after(10, self.fade_out)  # Reduced from 20ms to 10ms
        else:
            self.destroy()
    
    def animate_progress(self):
        """Animate the progress bar with smooth transitions"""
        if self.progress_value < 100:
            # Increment progress value faster
            target_value = min(100, self.progress_value + 2)  # Increased from 1 to 2
            self.progress.smooth_set(target_value)
            self.progress_value = target_value
            
            # Update status text with fade effect
            if self.progress_value < 25:  # Adjusted thresholds
                self.update_status("Đang khởi tạo hệ thống...")
            elif self.progress_value < 45:
                self.update_status("Đang kết nối cơ sở dữ liệu...")
            elif self.progress_value < 65:
                self.update_status("Đang tải giao diện người dùng...")
            elif self.progress_value < 85:
                self.update_status("Đang chuẩn bị dữ liệu hệ thống...")
            else:
                self.update_status("Sẵn sàng!", UI_STYLES['colors']['success'])
            
            self.after(30, self.animate_progress)  # Reduced from 50ms to 30ms
        else:
            self.after(200, self.fade_out)  # Reduced from 500ms to 200ms
    
    def update_status(self, text, color=None):
        """Update status text with optional color"""
        if self.status_label['text'] != text:
            if color is None:
                color = UI_STYLES['colors']['text_secondary']
            self.status_label.configure(text=text, foreground=color)

def show_splash(parent):
    """Show splash screen"""
    splash = SplashScreen(parent)
    parent.withdraw()  # Hide main window
    
    # Update splash screen
    splash.update()
    
    # Wait for splash screen to close
    parent.after(10, lambda: wait_for_splash(parent, splash))

def wait_for_splash(parent, splash):
    """Wait for splash screen to close before showing main window"""
    if splash.winfo_exists():
        parent.after(100, lambda: wait_for_splash(parent, splash))
    else:
        parent.deiconify()  # Show main window
