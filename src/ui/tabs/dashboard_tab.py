import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from src.ui.tabs.tab_base import TabBase
from src.services.dashboard_service import DashboardService
from src.utils.ui_styles import ModernButton, create_tooltip
from src.utils.config import UI_STYLES, UI_PADDING
import pandas as pd
import numpy as np

class DashboardTab(TabBase):
    def __init__(self, notebook, parent_form):
        """Initialize dashboard tab"""
        super().__init__(parent_form)
        self.tab = ttk.Frame(notebook)
        notebook.add(self.tab, text="Dashboard")
        self.dashboard_service = DashboardService(self.db_session)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup dashboard UI"""
        # Main container with padding
        self.container = ttk.Frame(self.tab, style='Content.TFrame')
        self.container.pack(fill='both', expand=True, padx=UI_PADDING['medium'], 
                          pady=UI_PADDING['medium'])
        
        # Control panel
        self.setup_control_panel()
        
        # Charts container
        self.charts_container = ttk.Frame(self.container, style='Content.TFrame')
        self.charts_container.pack(fill='both', expand=True, pady=UI_PADDING['medium'])
        
        # Initialize charts
        self.setup_charts()
        
        # Report generation panel
        self.setup_report_panel()
        
    def setup_control_panel(self):
        """Setup control panel with filters"""
        control_frame = ttk.Frame(self.container, style='Content.TFrame')
        control_frame.pack(fill='x', pady=(0, UI_PADDING['medium']))
        
        # Date range selector
        date_frame = ttk.Frame(control_frame, style='Content.TFrame')
        date_frame.pack(side='left', padx=UI_PADDING['medium'])
        
        ttk.Label(date_frame, text="Thời gian:", 
                 style='Content.TLabel').pack(side='left')
        
        self.period_var = tk.StringVar(value='daily')
        periods = [
            ('Ngày', 'daily'),
            ('Tuần', 'weekly'),
            ('Tháng', 'monthly')
        ]
        
        for text, value in periods:
            ttk.Radiobutton(date_frame, text=text, value=value,
                          variable=self.period_var,
                          command=self.update_charts).pack(side='left', 
                                                         padx=UI_PADDING['small'])
        
        # Refresh button with modern style
        refresh_btn = ttk.Button(
            control_frame,
            text="🔄 Làm mới",
            command=self.update_charts,
            style='Modern.TButton'
        )
        style = ttk.Style()
        style.configure('Modern.TButton', foreground='black')
        refresh_btn.pack(side='right', padx=UI_PADDING['medium'])
        create_tooltip(refresh_btn, "Cập nhật biểu đồ")
        
    def setup_charts(self):
        """Setup charts area"""
        # Sales chart
        sales_frame = ttk.LabelFrame(
            self.charts_container,
            text="Thống kê doanh số",
            style='Content.TLabelframe'
        )
        sales_frame.pack(fill='both', expand=True, pady=(0, UI_PADDING['medium']))
        
        self.sales_figure = plt.Figure(figsize=(10, 4), dpi=100)
        self.sales_canvas = FigureCanvasTkAgg(self.sales_figure, sales_frame)
        self.sales_canvas.get_tk_widget().pack(fill='both', expand=True, 
                                             padx=UI_PADDING['small'],
                                             pady=UI_PADDING['small'])
        
        # Product distribution chart
        product_frame = ttk.LabelFrame(
            self.charts_container,
            text="Phân bố sản phẩm",
            style='Content.TLabelframe'
        )
        product_frame.pack(fill='both', expand=True)
        
        self.product_figure = plt.Figure(figsize=(8, 4), dpi=100)
        self.product_canvas = FigureCanvasTkAgg(self.product_figure, product_frame)
        self.product_canvas.get_tk_widget().pack(fill='both', expand=True,
                                               padx=UI_PADDING['small'],
                                               pady=UI_PADDING['small'])
        
        # Initial update
        self.update_charts()
        
    def setup_report_panel(self):
        """Setup report generation panel"""
        report_frame = ttk.LabelFrame(
            self.container,
            text="Xuất báo cáo",
            style='Content.TLabelframe'
        )
        report_frame.pack(fill='x', pady=UI_PADDING['medium'])
        
        # Report controls
        controls_frame = ttk.Frame(report_frame, style='Content.TFrame')
        controls_frame.pack(fill='x', padx=UI_PADDING['medium'], 
                          pady=UI_PADDING['medium'])
        
        # Format selector
        format_frame = ttk.Frame(controls_frame, style='Content.TFrame')
        format_frame.pack(side='left')
        
        ttk.Label(format_frame, text="Định dạng:",
                 style='Content.TLabel').pack(side='left')
        
        self.format_var = tk.StringVar(value='pdf')
        formats = [('PDF', 'pdf'), ('Excel', 'excel'), ('CSV', 'csv')]
        
        for text, value in formats:
            ttk.Radiobutton(format_frame, text=text, value=value,
                          variable=self.format_var).pack(side='left',
                                                       padx=UI_PADDING['small'])
        
        # Email input
        email_frame = ttk.Frame(controls_frame, style='Content.TFrame')
        email_frame.pack(side='left', padx=UI_PADDING['large'])
        
        ttk.Label(email_frame, text="Email:",
                 style='Content.TLabel').pack(side='left')
        
        self.email_var = tk.StringVar()
        email_entry = ttk.Entry(email_frame, textvariable=self.email_var,
                              width=30)
        email_entry.pack(side='left', padx=UI_PADDING['small'])
        
        # Generate button
        generate_btn = ModernButton(
            controls_frame,
            text="📊 Tạo báo cáo",
            command=self.generate_report
        )
        generate_btn.pack(side='right')
        
        # Schedule frame
        schedule_frame = ttk.Frame(report_frame, style='Content.TFrame')
        schedule_frame.pack(fill='x', padx=UI_PADDING['medium'],
                          pady=UI_PADDING['medium'])
        
        ttk.Label(schedule_frame, text="Lập lịch:",
                 style='Content.TLabel').pack(side='left')
        
        self.schedule_var = tk.StringVar(value='none')
        schedules = [
            ('Không', 'none'),
            ('Hàng ngày', 'daily'),
            ('Hàng tuần', 'weekly'),
            ('Hàng tháng', 'monthly')
        ]
        
        for text, value in schedules:
            ttk.Radiobutton(schedule_frame, text=text, value=value,
                          variable=self.schedule_var,
                          command=self.update_schedule).pack(side='left',
                                                           padx=UI_PADDING['small'])
    
    def update_charts(self):
        """Update all charts"""
        try:
            # Clear previous charts
            self.sales_figure.clear()
            self.product_figure.clear()
            
            # Update sales chart
            period = self.period_var.get()
            sales_data = self.dashboard_service.get_sales_by_period(period=period)
            
            ax1 = self.sales_figure.add_subplot(111)
            ax2 = ax1.twinx()
            
            color1, color2 = '#1976D2', '#FF4081'
            
            # Plot quantity
            line1 = ax1.plot(sales_data['period'], sales_data['quantity'],
                            color=color1, label='Số lượng')
            ax1.set_xlabel('Thời gian')
            ax1.set_ylabel('Số lượng', color=color1)
            ax1.tick_params(axis='y', labelcolor=color1)
            
            # Plot amount
            line2 = ax2.plot(sales_data['period'], sales_data['amount'],
                            color=color2, label='Doanh thu')
            ax2.set_ylabel('Doanh thu', color=color2)
            ax2.tick_params(axis='y', labelcolor=color2)
            
            # Format y-axis to display amounts in millions
            def format_amount(x, p):
                return f'{x/1000000:.1f}M'
            ax2.yaxis.set_major_formatter(plt.FuncFormatter(format_amount))
            
            # Add legend
            lines = line1 + line2
            labels = [l.get_label() for l in lines]
            ax1.legend(lines, labels, loc='upper left')
            
            self.sales_figure.tight_layout()
            
            # Update product chart
            product_data = self.dashboard_service.get_product_distribution()
            
            # Sort by quantity descending
            product_data = product_data.sort_values('total_quantity', ascending=False)
            
            # Group small items (< 3%) into "Khác"
            total = product_data['total_quantity'].sum()
            mask = product_data['total_quantity'] / total >= 0.03
            main_products = product_data[mask]
            other_products = product_data[~mask]
            
            if not other_products.empty:
                other_sum = other_products['total_quantity'].sum()
                main_products = pd.concat([
                    main_products,
                    pd.DataFrame({
                        'ten_hang': ['Khác'],
                        'total_quantity': [other_sum],
                        'order_count': [other_products['order_count'].sum()]
                    })
                ])
            
            # Create pie chart with better styling
            ax = self.product_figure.add_subplot(111)
            
            def make_autopct(values):
                def my_autopct(pct):
                    total = sum(values)
                    val = int(round(pct*total/100.0))
                    return f'{pct:.1f}%'
                return my_autopct

            wedges, texts, autotexts = ax.pie(
                main_products['total_quantity'],
                labels=[''] * len(main_products),  # Remove direct labels
                autopct=make_autopct(main_products['total_quantity']),
                colors=plt.cm.Set3(np.linspace(0, 1, len(main_products))),
                pctdistance=0.75,  # Move percentage labels closer to center
                startangle=90  # Rotate to spread labels better
            )
            
            # Adjust percentage labels to prevent overlap
            for autotext in autotexts:
                autotext.set_fontsize(8)  # Smaller font size
                autotext.set_bbox(dict(facecolor='white', edgecolor='none', alpha=0.7, pad=0.5))
            
            # Add hover annotation
            annot = ax.annotate(
                "", 
                xy=(0,0), 
                xytext=(20,20),
                textcoords="offset points",
                bbox=dict(boxstyle="round,pad=0.5", fc="white", ec="gray", alpha=0.9),
                arrowprops=dict(arrowstyle="->"),
                visible=False
            )

            def hover(event):
                if event.inaxes == ax:
                    for i, wedge in enumerate(wedges):
                        if wedge.contains_point([event.x, event.y]):
                            # Make wedge "pop out"
                            wedge.set_radius(1.1)
                            # Show annotation with product name and percentage
                            percent = main_products['total_quantity'].iloc[i] / total * 100
                            annot.set_text(f"{main_products['ten_hang'].iloc[i]}\n{percent:.1f}%")
                            annot.xy = wedge.center
                            annot.set_visible(True)
                        else:
                            wedge.set_radius(1.0)
                    self.product_canvas.draw_idle()
                else:
                    # Reset all wedges and hide annotation when mouse leaves
                    for wedge in wedges:
                        wedge.set_radius(1.0)
                    annot.set_visible(False)
                    self.product_canvas.draw_idle()

            # Connect hover event
            self.product_canvas.mpl_connect("motion_notify_event", hover)
            
            # Add a legend
            ax.legend(
                wedges,
                main_products['ten_hang'],
                title="Sản phẩm",
                loc="center left",
                bbox_to_anchor=(1, 0, 0.5, 1)
            )
            
            ax.axis('equal')
            self.product_figure.tight_layout()
            
            # Redraw canvases
            self.sales_canvas.draw()
            self.product_canvas.draw()
            
        except Exception as e:
            messagebox.showerror(
                "Lỗi",
                f"Không thể cập nhật biểu đồ: {str(e)}"
            )
    
    def generate_report(self):
        """Generate and optionally send report"""
        try:
            format = self.format_var.get()
            email = self.email_var.get()
            
            report_file = self.dashboard_service.generate_dashboard_report(format)
            
            if email:
                self.dashboard_service.send_report_email(email, report_file)
                messagebox.showinfo(
                    "Thành công",
                    f"Đã tạo báo cáo và gửi đến {email}"
                )
            else:
                messagebox.showinfo(
                    "Thành công",
                    f"Đã tạo báo cáo: {report_file}"
                )
                
        except Exception as e:
            messagebox.showerror(
                "Lỗi",
                f"Không thể tạo báo cáo: {str(e)}"
            )
    
    def update_schedule(self):
        """Update report schedule"""
        schedule_type = self.schedule_var.get()
        email = self.email_var.get()
        format = self.format_var.get()
        
        if schedule_type != 'none':
            if not email:
                messagebox.showwarning(
                    "Cảnh báo",
                    "Vui lòng nhập email để nhận báo cáo tự động"
                )
                self.schedule_var.set('none')
                return
            
            try:
                self.dashboard_service.schedule_report(
                    schedule_type=schedule_type,
                    email=email,
                    format=format
                )
                messagebox.showinfo(
                    "Thành công",
                    f"Đã lập lịch gửi báo cáo {schedule_type}"
                )
            except Exception as e:
                messagebox.showerror(
                    "Lỗi",
                    f"Không thể lập lịch: {str(e)}"
                )
                self.schedule_var.set('none') 