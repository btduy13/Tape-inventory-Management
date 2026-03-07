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
    def __init__(self, container, parent_form):
        """Initialize dashboard tab"""
        super().__init__(parent_form)
        self.container = container
        self.COLORS = parent_form.COLORS
        self.FONTS = parent_form.FONTS
        self.dashboard_service = DashboardService(self.db_session)
        self.setup_ui()
        
    def setup_ui(self):
        """Setup dashboard UI"""
        from src.ui.components.modern_card import ModernCard
        
        # Main Scrollable Area (optional, but good for dashboard)
        self.main_scroll = tk.Frame(self.container, background=self.COLORS['background'])
        self.main_scroll.pack(fill='both', expand=True)
        
        # Welcome Header
        header_frame = tk.Frame(self.main_scroll, background=self.COLORS['background'])
        header_frame.pack(fill='x', pady=(0, 30))
        
        tk.Label(
            header_frame, text="Chào mừng trở lại! 👋", 
            font=self.FONTS['normal'],
            background=self.COLORS['background'],
            foreground=self.COLORS['text_light']
        ).pack(anchor='w')
        
        tk.Label(
            header_frame, text="Bảng điều khiển", 
            font=self.FONTS['header'],
            background=self.COLORS['background']
        ).pack(anchor='w')
        
        # Metrics Grid (Top Row)
        metrics_frame = tk.Frame(self.main_scroll, background=self.COLORS['background'])
        metrics_frame.pack(fill='x', pady=(0, 30))
        metrics_frame.columnconfigure((0, 1, 2, 3), weight=1, pad=20)
        
        self.card_total_orders = ModernCard(metrics_frame, "Đơn hàng", "0", "📦", "Tháng này")
        self.card_total_orders.grid(row=0, column=0, sticky='nsew', padx=(0, 10))
        
        self.card_revenue = ModernCard(metrics_frame, "Doanh thu", "0đ", "💰", "Tháng này", accent_color=self.COLORS['success'])
        self.card_revenue.grid(row=0, column=1, sticky='nsew', padx=10)
        
        self.card_avg_value = ModernCard(metrics_frame, "Giá trị TB", "0đ", "📈", "Mỗi đơn", accent_color=self.COLORS['accent_purple'])
        self.card_avg_value.grid(row=0, column=2, sticky='nsew', padx=10)
        
        self.card_top_cust = ModernCard(metrics_frame, "Khách hàng", "N/A", "👤", "Top tháng", accent_color=self.COLORS['accent_pink'])
        self.card_top_cust.grid(row=0, column=3, sticky='nsew', padx=(10, 0))
        
        # Middle Section: Charts
        charts_row = tk.Frame(self.main_scroll, background=self.COLORS['background'])
        charts_row.pack(fill='both', expand=True)
        charts_row.columnconfigure(0, weight=2) # Main chart
        charts_row.columnconfigure(1, weight=1) # Pie chart
        
        # Left: Sales Line Chart
        sales_card = tk.Frame(charts_row, background=self.COLORS['card'], padx=20, pady=20)
        sales_card.grid(row=0, column=0, sticky='nsew', padx=(0, 10))
        
        tk.Label(sales_card, text="Thống kê doanh số", font=self.FONTS['subheader'], background=self.COLORS['card']).pack(anchor='w')
        
        self.sales_figure = plt.Figure(figsize=(6, 4), dpi=100, facecolor=self.COLORS['card'])
        self.sales_canvas = FigureCanvasTkAgg(self.sales_figure, sales_card)
        self.sales_canvas.get_tk_widget().pack(fill='both', expand=True)
        self.sales_canvas.get_tk_widget().configure(background=self.COLORS['card'])

        # Right: Product Distribution
        product_card = tk.Frame(charts_row, background=self.COLORS['card'], padx=20, pady=20)
        product_card.grid(row=0, column=1, sticky='nsew', padx=(10, 0))
        
        tk.Label(product_card, text="Phân bố sản phẩm", font=self.FONTS['subheader'], background=self.COLORS['card']).pack(anchor='w')
        
        self.product_figure = plt.Figure(figsize=(4, 4), dpi=100, facecolor=self.COLORS['card'])
        self.product_canvas = FigureCanvasTkAgg(self.product_figure, product_card)
        self.product_canvas.get_tk_widget().pack(fill='both', expand=True)
        self.product_canvas.get_tk_widget().configure(background=self.COLORS['card'])
        
        # Period Selector (Floating in top right of sales card or header)
        period_frame = tk.Frame(header_frame, background=self.COLORS['background'])
        period_frame.place(relx=1.0, rely=1.0, anchor='se')
        
        self.period_var = tk.StringVar(value='daily')
        for text, val in [('Ngày', 'daily'), ('Tuần', 'weekly'), ('Tháng', 'monthly')]:
            rb = tk.Radiobutton(
                period_frame, text=text, value=val, 
                variable=self.period_var,
                command=self.update_charts,
                background=self.COLORS['background'],
                activebackground=self.COLORS['background'],
                font=self.FONTS['small']
            )
            rb.pack(side='left', padx=10)

        # Initial data load
        self.refresh_data()
        
    def refresh_data(self):
        """Update metrics and charts"""
        self.update_metrics()
        self.update_charts()

    def update_metrics(self):
        """Fetch and update total metrics"""
        try:
            sales_data = self.dashboard_service.get_sales_by_period(period='monthly')
            if not sales_data.empty:
                total_qty = sales_data['quantity'].sum()
                total_rev = sales_data['amount'].sum()
                avg_val = total_rev / len(sales_data) if len(sales_data) > 0 else 0
                
                self.card_total_orders.set_value(f"{int(total_qty):,}")
                self.card_revenue.set_value(f"{int(total_rev):,}đ")
                self.card_avg_value.set_value(f"{int(avg_val):,}đ")
                
                dist = self.dashboard_service.get_product_distribution()
                if not dist.empty:
                    top_prod = dist.iloc[0]['ten_hang']
                    self.card_top_cust.title_label.configure(text="  SẢN PHẨM CHỦ LỰC")
                    self.card_top_cust.set_value(top_prod[:15] + "..." if len(top_prod) > 15 else top_prod)
        except Exception as e:
            print(f"Error updating metrics: {e}")
    
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