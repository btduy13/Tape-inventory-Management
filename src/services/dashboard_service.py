import pandas as pd
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import seaborn as sns
from sqlalchemy import func, and_, text, extract
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import smtplib
import schedule
import threading
import os
from src.database.database import BangKeoInOrder, TrucInOrder, BangKeoOrder
from src.utils.config import EMAIL_CONFIG, REPORT_DIR

class DashboardService:
    def __init__(self, session):
        self.session = session
        self._setup_report_dir()
    
    def _setup_report_dir(self):
        """Ensure report directory exists"""
        if not os.path.exists(REPORT_DIR):
            os.makedirs(REPORT_DIR)
    
    def get_sales_by_period(self, start_date=None, end_date=None, period='daily'):
        """Get sales statistics by period"""
        if not start_date:
            start_date = datetime.now() - timedelta(days=30)
        if not end_date:
            end_date = datetime.now()

        # Define time grouping based on period
        if period == 'daily':
            date_trunc = 'day'
        elif period == 'weekly':
            date_trunc = 'week'
        else:  # monthly
            date_trunc = 'month'
            
        # Query for bang_keo_in orders
        bang_keo_in_query = self.session.query(
            func.date_trunc(date_trunc, BangKeoInOrder.thoi_gian).label('period'),
            func.sum(BangKeoInOrder.so_luong).label('quantity'),
            func.sum(BangKeoInOrder.thanh_tien_ban).label('amount')
        ).filter(
            and_(
                BangKeoInOrder.thoi_gian >= start_date,
                BangKeoInOrder.thoi_gian <= end_date
            )
        ).group_by('period')
        
        # Query for truc_in orders
        truc_in_query = self.session.query(
            func.date_trunc(date_trunc, TrucInOrder.thoi_gian).label('period'),
            func.sum(TrucInOrder.so_luong).label('quantity'),
            func.sum(TrucInOrder.thanh_tien_ban).label('amount')
        ).filter(
            and_(
                TrucInOrder.thoi_gian >= start_date,
                TrucInOrder.thoi_gian <= end_date
            )
        ).group_by('period')
        
        # Query for bang_keo orders
        bang_keo_query = self.session.query(
            func.date_trunc(date_trunc, BangKeoOrder.thoi_gian).label('period'),
            func.sum(BangKeoOrder.so_luong).label('quantity'),
            func.sum(BangKeoOrder.thanh_tien_ban).label('amount')
        ).filter(
            and_(
                BangKeoOrder.thoi_gian >= start_date,
                BangKeoOrder.thoi_gian <= end_date
            )
        ).group_by('period')
        
        # Combine results using pandas
        df_bki = pd.read_sql(bang_keo_in_query.statement, self.session.bind)
        df_ti = pd.read_sql(truc_in_query.statement, self.session.bind)
        df_bk = pd.read_sql(bang_keo_query.statement, self.session.bind)
        
        # Merge dataframes
        df = pd.concat([df_bki, df_ti, df_bk])
        
        # Group and aggregate
        df = df.groupby('period').agg({
            'quantity': 'sum',
            'amount': 'sum'
        }).reset_index()
        
        return df
    
    def get_product_distribution(self):
        """Get product distribution statistics"""
        # Query for bang_keo_in orders
        bang_keo_in_query = self.session.query(
            BangKeoInOrder.ten_hang,
            func.sum(BangKeoInOrder.so_luong).label('total_quantity'),
            func.count(BangKeoInOrder.id).label('order_count')
        ).group_by(BangKeoInOrder.ten_hang)
        
        # Query for truc_in orders
        truc_in_query = self.session.query(
            TrucInOrder.ten_hang,
            func.sum(TrucInOrder.so_luong).label('total_quantity'),
            func.count(TrucInOrder.id).label('order_count')
        ).group_by(TrucInOrder.ten_hang)
        
        # Query for bang_keo orders
        bang_keo_query = self.session.query(
            BangKeoOrder.ten_hang,
            func.sum(BangKeoOrder.so_luong).label('total_quantity'),
            func.count(BangKeoOrder.id).label('order_count')
        ).group_by(BangKeoOrder.ten_hang)
        
        # Combine results using pandas
        df_bki = pd.read_sql(bang_keo_in_query.statement, self.session.bind)
        df_ti = pd.read_sql(truc_in_query.statement, self.session.bind)
        df_bk = pd.read_sql(bang_keo_query.statement, self.session.bind)
        
        # Merge dataframes
        df = pd.concat([df_bki, df_ti, df_bk])
        df = df.groupby('ten_hang').sum().reset_index()
        
        return df
    
    def generate_sales_chart(self, period='daily', save_path=None):
        """Generate sales trend chart"""
        df = self.get_sales_by_period(period=period)
        
        plt.figure(figsize=(12, 6))
        sns.set_style("whitegrid")
        
        # Plot dual axis chart
        fig, ax1 = plt.subplots()
        
        color = 'tab:blue'
        ax1.set_xlabel('Thời gian')
        ax1.set_ylabel('Số lượng', color=color)
        ax1.plot(df['period'], df['quantity'], color=color)
        ax1.tick_params(axis='y', labelcolor=color)
        
        ax2 = ax1.twinx()
        color = 'tab:red'
        ax2.set_ylabel('Doanh thu', color=color)
        ax2.plot(df['period'], df['amount'], color=color)
        ax2.tick_params(axis='y', labelcolor=color)
        
        plt.title('Thống kê doanh số theo thời gian')
        fig.tight_layout()
        
        if save_path:
            plt.savefig(save_path)
            plt.close()
        return fig
    
    def generate_product_chart(self, save_path=None):
        """Generate product distribution chart"""
        df = self.get_product_distribution()
        
        plt.figure(figsize=(10, 6))
        sns.set_style("whitegrid")
        
        # Create pie chart
        plt.pie(df['total_quantity'], labels=df['ten_hang'], autopct='%1.1f%%')
        plt.title('Phân bố sản phẩm')
        
        if save_path:
            plt.savefig(save_path)
            plt.close()
    
    def generate_dashboard_report(self, format='pdf'):
        """Generate comprehensive dashboard report"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        report_file = os.path.join(REPORT_DIR, f'dashboard_report_{timestamp}.{format}')
        
        # Generate charts
        sales_chart = os.path.join(REPORT_DIR, f'sales_chart_{timestamp}.png')
        product_chart = os.path.join(REPORT_DIR, f'product_chart_{timestamp}.png')
        self.generate_sales_chart(save_path=sales_chart)
        self.generate_product_chart(save_path=product_chart)
        
        if format == 'pdf':
            self._generate_pdf_report(report_file, sales_chart, product_chart)
        elif format == 'excel':
            self._generate_excel_report(report_file)
        elif format == 'csv':
            self._generate_csv_report(report_file)
            
        # Cleanup temporary files
        os.remove(sales_chart)
        os.remove(product_chart)
        
        return report_file
    
    def _generate_pdf_report(self, output_file, sales_chart, product_chart):
        """Generate PDF report with charts and tables"""
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table
        from reportlab.lib.styles import getSampleStyleSheet
        
        doc = SimpleDocTemplate(output_file, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Add title
        story.append(Paragraph('Báo cáo thống kê', styles['Title']))
        story.append(Spacer(1, 12))
        
        # Add charts
        story.append(Image(sales_chart, width=450, height=300))
        story.append(Spacer(1, 12))
        story.append(Image(product_chart, width=400, height=300))
        
        # Add tables
        sales_data = self.get_sales_by_period()
        product_data = self.get_product_distribution()
        
        # Format tables
        sales_table = Table([['Thời gian', 'Số lượng', 'Doanh thu']] + 
                          sales_data.values.tolist())
        product_table = Table([['Sản phẩm', 'Số lượng', 'Số đơn hàng']] + 
                            product_data.values.tolist())
        
        story.extend([Spacer(1, 12), sales_table, Spacer(1, 12), product_table])
        doc.build(story)
    
    def _generate_excel_report(self, output_file):
        """Generate Excel report with multiple sheets"""
        with pd.ExcelWriter(output_file, engine='xlsxwriter') as writer:
            # Write sales data
            sales_data = self.get_sales_by_period()
            sales_data.to_excel(writer, sheet_name='Doanh số', index=False)
            
            # Write product data
            product_data = self.get_product_distribution()
            product_data.to_excel(writer, sheet_name='Sản phẩm', index=False)
            
            # Add charts
            workbook = writer.book
            
            # Sales chart
            sales_sheet = writer.sheets['Doanh số']
            chart = workbook.add_chart({'type': 'line'})
            chart.add_series({
                'name': 'Số lượng',
                'categories': ['Doanh số', 1, 0, len(sales_data), 0],
                'values': ['Doanh số', 1, 1, len(sales_data), 1],
            })
            sales_sheet.insert_chart('E2', chart)
            
            # Product chart
            product_sheet = writer.sheets['Sản phẩm']
            chart = workbook.add_chart({'type': 'pie'})
            chart.add_series({
                'name': 'Sản phẩm',
                'categories': ['Sản phẩm', 1, 0, len(product_data), 0],
                'values': ['Sản phẩm', 1, 1, len(product_data), 1],
            })
            product_sheet.insert_chart('E2', chart)
    
    def _generate_csv_report(self, output_file):
        """Generate CSV report (multiple files in zip)"""
        import zipfile
        
        base_name = output_file.rsplit('.', 1)[0]
        zip_file = f"{base_name}.zip"
        
        with zipfile.ZipFile(zip_file, 'w') as zf:
            # Sales data
            sales_file = f"{base_name}_sales.csv"
            self.get_sales_by_period().to_csv(sales_file, index=False)
            zf.write(sales_file, os.path.basename(sales_file))
            os.remove(sales_file)
            
            # Product data
            product_file = f"{base_name}_products.csv"
            self.get_product_distribution().to_csv(product_file, index=False)
            zf.write(product_file, os.path.basename(product_file))
            os.remove(product_file)
    
    def schedule_report(self, schedule_type='daily', email=None, format='pdf'):
        """Schedule automated report generation"""
        def generate_and_send():
            report_file = self.generate_dashboard_report(format)
            if email:
                self.send_report_email(email, report_file)
        
        if schedule_type == 'daily':
            schedule.every().day.at("08:00").do(generate_and_send)
        elif schedule_type == 'weekly':
            schedule.every().monday.at("08:00").do(generate_and_send)
        elif schedule_type == 'monthly':
            schedule.every().month.at("08:00").do(generate_and_send)
            
        # Run scheduler in background
        threading.Thread(target=self._run_scheduler, daemon=True).start()
    
    def _run_scheduler(self):
        """Run the scheduler"""
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    def send_report_email(self, email, report_file):
        """Send report via email"""
        msg = MIMEMultipart()
        msg['Subject'] = f'Báo cáo thống kê - {datetime.now().strftime("%Y-%m-%d")}'
        msg['From'] = EMAIL_CONFIG['sender']
        msg['To'] = email
        
        # Add body
        body = "Kính gửi,\n\nĐính kèm là báo cáo thống kê.\n\nTrân trọng."
        msg.attach(MIMEText(body, 'plain'))
        
        # Add attachment
        with open(report_file, 'rb') as f:
            attachment = MIMEApplication(f.read(), _subtype=os.path.splitext(report_file)[1][1:])
            attachment.add_header('Content-Disposition', 'attachment', 
                                filename=os.path.basename(report_file))
            msg.attach(attachment)
        
        # Send email
        with smtplib.SMTP(EMAIL_CONFIG['server'], EMAIL_CONFIG['port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['username'], EMAIL_CONFIG['password'])
            server.send_message(msg) 