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
                email_content = (
                    f"Chào bác,\n\n"
                    f"Bác làm giúp con đơn hàng in logo \"{values[2]}\" này nhé\n"  # ten_hang
                    f"Màu sắc: {values[12]} / Màu keo: {values[10]}\n"  # mau_sac, mau_keo
                    f"Số lượng: {values[8]} cuộn\n"  # so_luong
                    f"Quy cách: {int(values[4])}mm * {int(values[5])}m * {int(values[6])}mic\n"  # quy_cach
                    f"Lõi giấy: {values[26]} - Thùng bao: {values[27]}\n\n"  # loi_giay, thung_bao
                    f"Cám ơn bác\n"
                    f"Quế"
                )
            else:
                email_content = (
                    f"Chào bác,\n\n"
                    f"Bác làm giúp con đơn hàng trục in \"{values[2]}\" này nhé\n"  # ten_hang
                    f"Màu sắc: {values[6]} / Màu keo: {values[7]}\n"  # mau_sac, mau_keo
                    f"Số lượng: {values[5]} cái\n"  # so_luong
                    f"Quy cách: {int(values[4])}mm\n\n"  # quy_cach
                    f"Cám ơn bác\n"
                    f"Quế"
                )

            file_path = filedialog.asksaveasfilename(
                defaultextension='.txt',
                filetypes=[("Text files", "*.txt")],
                title="Chọn vị trí lưu file văn bản"
            )

            if file_path:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(email_content)
                messagebox.showinfo("Thành công", "Đã xuất nội dung email ra file văn bản thành công!")
                self.parent.update_status("Đã xuất email thành công")

                os.startfile(file_path)
            else:
                self.parent.update_status("Xuất email bị hủy")

        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi xuất email: {str(e)}")
            self.parent.update_status("Lỗi khi xuất email") 