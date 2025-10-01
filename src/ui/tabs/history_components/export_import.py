import tkinter as tk
from tkinter import ttk, messagebox, filedialog
from datetime import datetime
import os
from openpyxl import Workbook, load_workbook
import logging

class ExportImportManager:
    def __init__(self, parent):
        self.parent = parent
        self.DATE_FORMAT = '%d/%m/%Y'
        
    def create_import_export_buttons(self, button_frame):
        button_frame.columnconfigure((0, 1, 2, 3), weight=1)
    
        export_bang_keo_in_button = ttk.Button(button_frame, text="Export Băng Keo Template", 
                                              command=lambda: self.export_template('bang_keo_in'))
        export_bang_keo_in_button.grid(row=0, column=0, padx=5, sticky='ew')
    
        export_truc_in_button = ttk.Button(button_frame, text="Export Trục In Template", 
                                         command=lambda: self.export_template('truc_in'))
        export_truc_in_button.grid(row=0, column=1, padx=5, sticky='ew')
    
        import_bang_keo_in_button = ttk.Button(button_frame, text="Import Băng Keo Data", 
                                             command=lambda: self.import_data('bang_keo_in'))
        import_bang_keo_in_button.grid(row=0, column=2, padx=5, sticky='ew')
    
        import_truc_in_button = ttk.Button(button_frame, text="Import Trục In Data", 
                                         command=lambda: self.import_data('truc_in'))
        import_truc_in_button.grid(row=0, column=3, padx=5, sticky='ew')
        
    def export_selected_to_excel(self, tree, sheet_name):
        try:
            selected_items = tree.selection()
            if not selected_items:
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một dòng để xuất Excel")
                return
            
            headers = [tree.heading(col)['text'] for col in tree['columns']]
            
            data = []
            for item in selected_items:
                values = list(tree.item(item)['values'])
                if sheet_name == "Bang keo in":
                    if values[1]:  # thoi_gian
                        try:
                            date_obj = datetime.strptime(values[1], self.DATE_FORMAT)
                            values[1] = date_obj.strftime('%m/%d/%Y')
                        except ValueError:
                            pass
                    if values[3]:  # ngay_du_kien
                        try:
                            date_obj = datetime.strptime(values[3], self.DATE_FORMAT)
                            values[3] = date_obj.strftime('%m/%d/%Y')
                        except ValueError:
                            pass
                else:
                    if values[1]:  # thoi_gian
                        try:
                            date_obj = datetime.strptime(values[1], self.DATE_FORMAT)
                            values[1] = date_obj.strftime('%m/%d/%Y')
                        except ValueError:
                            pass
                    if values[3]:  # ngay_du_kien
                        try:
                            date_obj = datetime.strptime(values[3], self.DATE_FORMAT)
                            values[3] = date_obj.strftime('%m/%d/%Y')
                        except ValueError:
                            pass
                data.append(values)
            
            current_time = datetime.now().strftime('%d-%m-%y')
            default_filename = f"DonHang_{sheet_name}_{current_time}.xlsx"
            file_path = filedialog.asksaveasfilename(
                defaultextension=".xlsx",
                filetypes=[("Excel files", "*.xlsx")],
                initialfile=default_filename
            )
            
            if not file_path:
                return

            if os.path.exists(file_path):
                wb = load_workbook(file_path)
                if sheet_name in wb.sheetnames:
                    ws = wb[sheet_name]
                    next_row = ws.max_row + 1
                else:
                    ws = wb.create_sheet(sheet_name)
                    for col, header in enumerate(headers, 1):
                        ws.cell(row=1, column=col, value=header)
                    next_row = 2
            else:
                wb = Workbook()
                ws = wb.active
                ws.title = sheet_name
                for col, header in enumerate(headers, 1):
                    ws.cell(row=1, column=col, value=header)
                next_row = 2

            for row_data in data:
                for col, value in enumerate(row_data, 1):
                    ws.cell(row=next_row, column=col, value=value)
                next_row += 1

            wb.save(file_path)
            
            messagebox.showinfo("Thành công", f"Đã xuất dữ liệu ra file Excel:\n{file_path}")
            self.parent.update_status("Đã xuất Excel thành công")
            
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi xuất Excel: {str(e)}")
            self.parent.update_status("Lỗi khi xuất Excel")
            
    def export_selected_to_email(self, tree, order_type):
        try:
            selected_items = tree.selection()
            if not selected_items:
                messagebox.showwarning("Cảnh báo", "Vui lòng chọn ít nhất một dòng để xuất email")
                return

            values = tree.item(selected_items[0])['values']
            
            if order_type == 'bang_keo_in':
                # Safely get quy_cach values
                quy_cach_mm = str(values[5]) if values[5] else "0"
                quy_cach_m = str(values[6]) if values[6] else "0"
                quy_cach_mic = str(values[7]) if values[7] else "0"
                
                email_content = (
                    f"Chào bác,\n\n"
                    f"Bác làm giúp con đơn hàng in logo \"{values[2]}\" này nhé\n"  # ten_hang
                    f"Màu sắc: {values[13]}\n"
                    f"Màu keo: {values[11]}\n"  # mau_sac, mau_keo
                    f"Số lượng: {values[9]} cuộn\n"  # so_luong
                    f"Quy cách: {quy_cach_mm}mm * {quy_cach_m}m * {quy_cach_mic}mic\n"  # quy_cach
                    f"Lõi giấy: {values[27]} - Thùng bao: {values[28]}\n\n"  # loi_giay, thung_bao
                    f"Cám ơn bác\n"
                    f"Quế"
                )
            elif order_type == 'truc_in':
                email_content = (
                    f"Chào bác,\n\n"
                    f"Bác làm giúp con đơn hàng Trục In \"{values[2]}\" này nhé\n"  # ten_hang
                    f"Màu sắc: {values[7]}\n"
                    f"Màu keo: {values[8]}\n"  # mau_sac, mau_keo
                    f"Số lượng: {values[6]} cuộn\n"  # so_luong
                    f"Quy cách: {values[5]}\n\n"  # quy_cach
                    f"Cám ơn bác\n"
                    f"Quế"
                )
            else:  # bang_keo
                email_content = (
                    f"Chào bác,\n\n"
                    f"Bác làm giúp con đơn hàng Băng Keo \"{values[2]}\" này nhé\n"  # ten_hang
                    f"Màu sắc: {values[7]}\n"  # mau_sac
                    f"Số lượng: {values[6]} KG\n"  # so_luong
                    f"Quy cách: {values[5]} KG\n\n"  # quy_cach
                    f"Cám ơn bác\n"
                    f"Quế"
                )

            # Create temporary file
            current_date = datetime.now().strftime('%Y%m%d_%H%M%S')
            file_name = f"{order_type}_{current_date}.txt"
            temp_file = os.path.join(os.environ.get('TEMP') or os.environ.get('TMP') or '/tmp', file_name)

            # Write content to temp file
            with open(temp_file, 'w', encoding='utf-8') as file:
                file.write(email_content)

            # Open the file with default text editor
            os.startfile(temp_file)

            # Also allow saving to custom location
            file_path = filedialog.asksaveasfilename(
                defaultextension='.txt',
                filetypes=[("Text files", "*.txt")],
                title="Chọn vị trí lưu file văn bản",
                initialfile=file_name
            )

            if file_path:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(email_content)
                messagebox.showinfo("Thành công", "Đã xuất nội dung email ra file văn bản thành công!")
                self.parent.update_status("Đã xuất email thành công")
            else:
                self.parent.update_status("Xuất email bị hủy")

        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi xuất email: {str(e)}")
            self.parent.update_status("Lỗi khi xuất email") 