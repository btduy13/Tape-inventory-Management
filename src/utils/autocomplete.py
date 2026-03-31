import tkinter as tk
from tkinter import ttk

class AutocompleteEntry(ttk.Entry):
    def __init__(self, master, suggestions=None, callback=None, **kwargs):
        super().__init__(master, **kwargs)
        self.suggestions = suggestions if suggestions else []
        self.callback = callback
        self.lb_parent = None
        self.lb = None
        self.var = tk.StringVar()
        self._last_callback_value = ""
        self.config(textvariable=self.var)
        
        self.var.trace_add('write', self.on_write)
        self.bind('<Down>', self.on_down_arrow)
        self.bind('<Up>', self.on_up_arrow)
        self.bind('<Return>', self.on_selection)
        self.bind('<Tab>', self.on_selection)
        self.bind('<Escape>', self.hide_lb)
        self.bind('<FocusOut>', self.on_focus_out)

    def set_suggestions(self, suggestions):
        self.suggestions = suggestions

    def on_write(self, *args):
        val = self.var.get()
        if not val or not self.suggestions:
            self.hide_lb()
            return

        filtered = [s for s in self.suggestions if val.lower() in s.lower()]
        if not filtered:
            self.hide_lb()
            return

        self.show_lb(filtered)

    def show_lb(self, values):
        if not self.lb_parent:
            self.lb_parent = tk.Toplevel(self.winfo_toplevel())
            self.lb_parent.withdraw()
            self.lb_parent.overrideredirect(True)
            self.lb = tk.Listbox(self.lb_parent, font=self.cget('font'), background='white', borderwidth=1)
            self.lb.pack(fill=tk.BOTH, expand=True)
            self.lb.bind('<ButtonRelease-1>', self.on_selection)
            self.lb.bind('<Return>', self.on_selection)

        self.lb.delete(0, tk.END)
        for v in values:
            self.lb.insert(tk.END, v)

        # Position the dropdown
        x = self.winfo_rootx()
        y = self.winfo_rooty() + self.winfo_height()
        width = self.winfo_width()
        height = min(len(values) * 20, 200) # Max height 200px
        
        self.lb_parent.geometry(f"{width}x{height}+{x}+{y}")
        self.lb_parent.deiconify()
        self.lb_parent.attributes('-topmost', True)

    def hide_lb(self, event=None):
        if self.lb_parent:
            self.lb_parent.withdraw()

    def on_focus_out(self, event=None):
        self.after(200, self.hide_lb)
        val = self.var.get()
        if self.callback and val != getattr(self, '_last_callback_value', ""):
            self.callback(val)
            self._last_callback_value = val

    def on_selection(self, event=None):
        selection = None
        if event and hasattr(event, 'y'): # Mouse click
            index = self.lb.nearest(event.y)
            selection = self.lb.get(index)
        elif self.lb and hasattr(self, 'lb_parent') and self.lb_parent and self.lb_parent.state() == 'normal' and self.lb.curselection(): # Key press or default selection
            selection = self.lb.get(self.lb.curselection())
        
        if selection:
            self.var.set(selection)
            self.icursor(tk.END)
            self.hide_lb()
            if self.callback and selection != getattr(self, '_last_callback_value', ""):
                self.callback(selection)
                self._last_callback_value = selection
        elif event and event.keysym in ('Return', 'Tab'):
            self.hide_lb()
            val = self.var.get()
            if self.callback and val != getattr(self, '_last_callback_value', ""):
                self.callback(val)
                self._last_callback_value = val

    def on_down_arrow(self, event):
        if self.lb_parent and self.lb_parent.state() == 'normal':
            curr = self.lb.curselection()
            if not curr:
                self.lb.selection_set(0)
            else:
                index = (curr[0] + 1) % self.lb.size()
                self.lb.selection_clear(0, tk.END)
                self.lb.selection_set(index)
                self.lb.see(index)
            return "break"

    def on_up_arrow(self, event):
        if self.lb_parent and self.lb_parent.state() == 'normal':
            curr = self.lb.curselection()
            if not curr:
                self.lb.selection_set(tk.END)
            else:
                index = (curr[0] - 1) % self.lb.size()
                self.lb.selection_clear(0, tk.END)
                self.lb.selection_set(index)
                self.lb.see(index)
            return "break"
