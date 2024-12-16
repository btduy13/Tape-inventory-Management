import os
from PIL import Image, ImageTk
import tkinter as tk
from src.utils.config import ICON_ICO, ICON_PNG

def set_window_icon(window):
    """Set the window icon for both the window and taskbar.
    
    Args:
        window: The Tkinter window or Toplevel widget to set the icon for
    """
    try:
        if os.path.exists(ICON_ICO):
            # For Windows - use .ico file
            window.iconbitmap(ICON_ICO)
        elif os.path.exists(ICON_PNG):
            # For other platforms or fallback - use .png file
            icon_image = ImageTk.PhotoImage(file=ICON_PNG)
            window.iconphoto(True, icon_image)
        else:
            print("Warning: No icon file found at", ICON_ICO, "or", ICON_PNG)
    except Exception as e:
        print(f"Error setting window icon: {str(e)}")

def center_window(window, width, height):
    """Center a window on the screen.
    
    Args:
        window: The Tkinter window or Toplevel widget to center
        width: Desired window width
        height: Desired window height
    """
    # Get screen dimensions
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    
    # Calculate position
    x = (screen_width - width) // 2
    y = (screen_height - height) // 2
    
    # Set window size and position
    window.geometry(f"{width}x{height}+{x}+{y}") 