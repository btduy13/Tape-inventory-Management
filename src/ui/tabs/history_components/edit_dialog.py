import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from tkcalendar import DateEntry
from src.database.database import BangKeoInOrder, TrucInOrder, BangKeoOrder

class EditDialogManager:
    def __init__(self, parent):
        self.parent = parent
        self.DATE_FORMAT = '%d/%m/%Y'
        self.DATE_FORMAT = '%d/%m/%Y'
        self.edit_entries = {}
        self.current_edit_item = None
        self.current_edit_type = None
        
    def show_edit_form(self, order_type, tree, db_session):
        if order_type == 'bang_keo_in':
            readonly_fields = [
                'id',
                'don_gia_goc', 'thanh_tien_goc', 'thanh_tien_ban',
                'cong_no_khach', 'tien_hoa_hong', 'loi_nhuan'
            ]
            calculation_trigger_fields = [
                'so_luong', 'phi_sl', 'phi_keo', 'phi_size', 'phi_cat', 'don_gia_von', 'don_gia_ban', 'tien_coc',
                'hoa_hong', 'phi_mau', 'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay'
            ]
            window_title = "Chỉnh sửa đơn hàng băng keo in"
        elif order_type == 'truc_in':
            readonly_fields = [
                'id',
                'thanh_tien', 'thanh_tien_ban', 'cong_no_khach',
                'tien_hoa_hong', 'loi_nhuan'
            ]
            calculation_trigger_fields = [
                'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
            ]
            window_title = "Chỉnh sửa đơn hàng trục in"
        else:  # bang_keo
            readonly_fields = [
                'id',
                'thanh_tien', 'thanh_tien_ban', 'cong_no_khach',
                'tien_hoa_hong', 'loi_nhuan'
            ]
            calculation_trigger_fields = [
                'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
            ]
            window_title = "Chỉnh sửa đơn hàng băng keo"
            
        selected_item = tree.selection()
        if not selected_item:
            return
            
        values = tree.item(selected_item[0])['values']
        self.current_edit_item = selected_item[0]
        self.current_edit_type = order_type
        
        # Get the root window from the tree widget
        root = tree.winfo_toplevel()
        
        edit_window = tk.Toplevel(root)
        edit_window.title(window_title)
        edit_window.geometry("800x600")
        edit_window.minsize(800, 600)
        
        edit_window.transient(root)
        edit_window.grab_set()
        
        window_width = 800
        window_height = 600
        screen_width = edit_window.winfo_screenwidth()
        screen_height = edit_window.winfo_screenheight()
        center_x = int((screen_width - window_width) / 2)
        center_y = int((screen_height - window_height) / 2)
        edit_window.geometry(f'{window_width}x{window_height}+{center_x}+{center_y}')
        
        main_frame = ttk.Frame(edit_window, padding="10 10 10 10")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        self.edit_entries = {}
        
        if order_type == 'bang_keo_in':
            self._create_bang_keo_in_form(main_frame, values, readonly_fields)
        elif order_type == 'truc_in':
            self._create_truc_in_form(main_frame, values, readonly_fields)
        else:  # bang_keo
            self._create_bang_keo_form(main_frame, values, readonly_fields)
        
        button_frame = ttk.Frame(edit_window)
        button_frame.pack(side=tk.BOTTOM, fill=tk.X, padx=10, pady=10)
        
        ttk.Button(button_frame, text="Lưu", 
                  command=lambda: self.save_edit(tree, db_session, edit_window)).pack(side=tk.RIGHT, padx=5)
        ttk.Button(button_frame, text="Hủy", 
                  command=edit_window.destroy).pack(side=tk.RIGHT, padx=5)
        
        edit_window.bind('<Escape>', lambda e: edit_window.destroy())
        edit_window.bind('<Control-s>', lambda e: self.save_edit(tree, db_session, edit_window))
        
        for entry in self.edit_entries.values():
            if entry.cget('state') != 'readonly':
                entry.focus_set()
                break
                
    def _create_bang_keo_in_form(self, main_frame, values, readonly_fields):
        info_frame = ttk.LabelFrame(main_frame, text="Thông tin đơn hàng", padding="5 5 5 5")
        info_frame.pack(fill=tk.X, padx=5, pady=5)
        
        specs_frame = ttk.LabelFrame(main_frame, text="Quy cách", padding="5 5 5 5")
        specs_frame.pack(fill=tk.X, padx=5, pady=5)
        
        price_frame = ttk.LabelFrame(main_frame, text="Giá và phí", padding="5 5 5 5")
        price_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Info section
        self._create_field(info_frame, 'thoi_gian', 'Thời gian:', values, 0, 0, readonly_fields)
        self._create_field(info_frame, 'ten_hang', 'Tên hàng:', values, 0, 2, readonly_fields)
        self._create_field(info_frame, 'ngay_du_kien', 'Ngày dự kiến:', values, 1, 0, readonly_fields)
        
        # Specs section
        self._create_field(specs_frame, 'quy_cach_mm', 'Quy cách (mm):', values, 0, 0, readonly_fields)
        self._create_field(specs_frame, 'quy_cach_m', 'Quy cách (m):', values, 0, 2, readonly_fields)
        self._create_field(specs_frame, 'quy_cach_mic', 'Quy cách (mic):', values, 1, 0, readonly_fields)
        self._create_field(specs_frame, 'cuon_cay', 'Cuộn/cây:', values, 1, 2, readonly_fields)
        self._create_field(specs_frame, 'so_luong', 'Số lượng:', values, 2, 0, readonly_fields)
        
        # Price section
        self._create_field(price_frame, 'phi_sl', 'Phí SL:', values, 0, 0, readonly_fields)
        self._create_field(price_frame, 'mau_keo', 'Màu keo:', values, 0, 2, readonly_fields)
        self._create_field(price_frame, 'phi_keo', 'Phí keo:', values, 0, 4, readonly_fields)
        
        self._create_field(price_frame, 'mau_sac', 'Màu sắc:', values, 1, 0, readonly_fields)
        self._create_field(price_frame, 'phi_mau', 'Phí màu:', values, 1, 2, readonly_fields)
        self._create_field(price_frame, 'phi_size', 'Phí size:', values, 1, 4, readonly_fields)
        
        self._create_field(price_frame, 'phi_cat', 'Phí cắt:', values, 2, 0, readonly_fields)
        self._create_field(price_frame, 'don_gia_von', 'Đơn giá vốn:', values, 2, 2, readonly_fields)
        self._create_field(price_frame, 'don_gia_goc', 'Đơn giá gốc:', values, 2, 4, readonly_fields)
        
        self._create_field(price_frame, 'thanh_tien_goc', 'Thành tiền gốc:', values, 3, 0, readonly_fields)
        self._create_field(price_frame, 'don_gia_ban', 'Đơn giá bán:', values, 3, 2, readonly_fields)
        self._create_field(price_frame, 'thanh_tien_ban', 'Thành tiền bán:', values, 3, 4, readonly_fields)
        
        self._create_field(price_frame, 'tien_coc', 'Tiền cọc:', values, 4, 0, readonly_fields)
        self._create_field(price_frame, 'cong_no_khach', 'Công nợ khách:', values, 4, 2, readonly_fields)
        
        self._create_field(price_frame, 'ctv', 'CTV:', values, 5, 0, readonly_fields)
        self._create_field(price_frame, 'hoa_hong', 'Hoa hồng (%):', values, 5, 2, readonly_fields)
        self._create_field(price_frame, 'tien_hoa_hong', 'Tiền hoa hồng:', values, 5, 4, readonly_fields)
        
        self._create_field(price_frame, 'loi_giay', 'Lõi giấy:', values, 6, 0, readonly_fields)
        self._create_field(price_frame, 'thung_bao', 'Thùng/Bao:', values, 6, 2, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan', 'Lợi nhuận:', values, 6, 4, readonly_fields)
        
    def _create_truc_in_form(self, main_frame, values, readonly_fields):
        info_frame = ttk.LabelFrame(main_frame, text="Thông tin đơn hàng", padding="5 5 5 5")
        info_frame.pack(fill=tk.X, padx=5, pady=5)
        
        specs_frame = ttk.LabelFrame(main_frame, text="Quy cách", padding="5 5 5 5")
        specs_frame.pack(fill=tk.X, padx=5, pady=5)
        
        price_frame = ttk.LabelFrame(main_frame, text="Giá và phí", padding="5 5 5 5")
        price_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Info section
        self._create_field(info_frame, 'thoi_gian', 'Thời gian:', values, 0, 0, readonly_fields)
        self._create_field(info_frame, 'ten_hang', 'Tên hàng:', values, 0, 2, readonly_fields)
        self._create_field(info_frame, 'ngay_du_kien', 'Ngày dự kiến:', values, 1, 0, readonly_fields)
        
        # Specs section
        self._create_field(specs_frame, 'quy_cach', 'Quy cách:', values, 0, 0, readonly_fields)
        self._create_field(specs_frame, 'so_luong', 'Số lượng:', values, 0, 2, readonly_fields)
        self._create_field(specs_frame, 'mau_sac', 'Màu sắc:', values, 1, 0, readonly_fields)
        self._create_field(specs_frame, 'mau_keo', 'Màu keo:', values, 1, 2, readonly_fields)
        
        # Price section
        self._create_field(price_frame, 'don_gia_goc', 'Đơn giá gốc:', values, 0, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien', 'Thành tiền:', values, 0, 2, readonly_fields)
        
        self._create_field(price_frame, 'don_gia_ban', 'Đơn giá bán:', values, 1, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien_ban', 'Thành tiền bán:', values, 1, 2, readonly_fields)
        
        self._create_field(price_frame, 'cong_no_khach', 'Công nợ khách:', values, 2, 0, readonly_fields)
        
        self._create_field(price_frame, 'ctv', 'CTV:', values, 3, 0, readonly_fields)
        self._create_field(price_frame, 'hoa_hong', 'Hoa hồng (%):', values, 3, 2, readonly_fields)
        
        self._create_field(price_frame, 'tien_hoa_hong', 'Tiền hoa hồng:', values, 4, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan', 'Lợi nhuận:', values, 4, 2, readonly_fields)
        
    def _create_bang_keo_form(self, main_frame, values, readonly_fields):
        info_frame = ttk.LabelFrame(main_frame, text="Thông tin đơn hàng", padding="5 5 5 5")
        info_frame.pack(fill=tk.X, padx=5, pady=5)
        
        specs_frame = ttk.LabelFrame(main_frame, text="Quy cách", padding="5 5 5 5")
        specs_frame.pack(fill=tk.X, padx=5, pady=5)
        
        price_frame = ttk.LabelFrame(main_frame, text="Giá và phí", padding="5 5 5 5")
        price_frame.pack(fill=tk.X, padx=5, pady=5)
        
        # Info section
        self._create_field(info_frame, 'thoi_gian', 'Thời gian:', values, 0, 0, readonly_fields)
        self._create_field(info_frame, 'ten_hang', 'Tên hàng:', values, 0, 2, readonly_fields)
        self._create_field(info_frame, 'ngay_du_kien', 'Ngày dự kiến:', values, 1, 0, readonly_fields)
        
        # Specs section
        self._create_field(specs_frame, 'quy_cach', 'Quy cách (KG):', values, 0, 0, readonly_fields)
        self._create_field(specs_frame, 'so_luong', 'Số lượng:', values, 0, 2, readonly_fields)
        self._create_field(specs_frame, 'mau_sac', 'Màu sắc:', values, 1, 0, readonly_fields)
        
        # Price section
        self._create_field(price_frame, 'don_gia_goc', 'Đơn giá gốc:', values, 0, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien', 'Thành tiền:', values, 0, 2, readonly_fields)
        
        self._create_field(price_frame, 'don_gia_ban', 'Đơn giá bán:', values, 1, 0, readonly_fields)
        self._create_field(price_frame, 'thanh_tien_ban', 'Thành tiền bán:', values, 1, 2, readonly_fields)
        
        self._create_field(price_frame, 'cong_no_khach', 'Công nợ khách:', values, 2, 0, readonly_fields)
        
        self._create_field(price_frame, 'ctv', 'CTV:', values, 3, 0, readonly_fields)
        self._create_field(price_frame, 'hoa_hong', 'Hoa hồng (%):', values, 3, 2, readonly_fields)
        
        self._create_field(price_frame, 'tien_hoa_hong', 'Tiền hoa hồng:', values, 4, 0, readonly_fields)
        self._create_field(price_frame, 'loi_nhuan', 'Lợi nhuận:', values, 4, 2, readonly_fields)

    def _create_field(self, parent, field_name, label_text, values, row, col, readonly_fields):
        """Create a labeled field in the edit form"""
        ttk.Label(parent, text=label_text).grid(row=row, column=col, sticky=tk.W, padx=5, pady=5)
        
        field_index = list(self.parent.bang_keo_in_tree['columns'] if self.current_edit_type == 'bang_keo_in' 
                          else self.parent.truc_in_tree['columns'] if self.current_edit_type == 'truc_in'
                          else self.parent.bang_keo_tree['columns']).index(field_name)
        
        if field_name in ['thoi_gian', 'ngay_du_kien']:
            date_value = values[field_index] if values[field_index] else datetime.now()
            entry = DateEntry(parent, width=15, background='darkblue',
                             foreground='white', borderwidth=2,
                             date_pattern='dd/mm/yyyy',
                             locale='vi_VN')
            try:
                if isinstance(date_value, datetime):
                    entry.set_date(date_value.date())
                elif isinstance(date_value, str):
                    try:
                        entry.set_date(datetime.strptime(date_value, self.DATE_FORMAT).date())
                    except ValueError:
                        entry.set_date(datetime.strptime(date_value, self.DATE_FORMAT).date())
                else:
                    entry.set_date(datetime.now().date())
            except ValueError:
                entry.set_date(datetime.now().date())
        else:
            entry = ttk.Entry(parent, width=15)
            entry.insert(0, values[field_index] if values[field_index] is not None else '')
            
            if field_name in readonly_fields:
                entry.configure(state='readonly')
            
            # Define calculation trigger fields for each order type
            calculation_trigger_fields = {
                'bang_keo_in': [
                    'so_luong', 'phi_sl', 'phi_keo', 'phi_size', 'phi_cat', 'don_gia_von',
                    'don_gia_ban', 'tien_coc', 'hoa_hong', 'phi_mau', 'quy_cach_mm',
                    'quy_cach_m', 'quy_cach_mic', 'cuon_cay'
                ],
                'truc_in': [
                    'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
                ],
                'bang_keo': [
                    'so_luong', 'don_gia_ban', 'don_gia_goc', 'hoa_hong'
                ]
            }[self.current_edit_type]
            
            # Bind calculation triggers
            if field_name in calculation_trigger_fields:
                entry.bind('<KeyRelease>', lambda e: self.recalculate_edit_form(self.current_edit_type))
                entry.bind('<FocusOut>', lambda e: (
                    self.format_currency_input(e),
                    self.recalculate_edit_form(self.current_edit_type)
                ))
            # Format currency for numeric fields
            elif field_name in ['don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban',
                              'tien_coc', 'cong_no_khach', 'tien_hoa_hong', 'loi_nhuan',
                              'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von',
                              'thanh_tien']:
                entry.bind('<FocusOut>', self.format_currency_input)
        
        entry.grid(row=row, column=col+1, sticky=tk.W, padx=5, pady=5)
        self.edit_entries[field_name] = entry
        
    def save_edit(self, tree, db_session, edit_window):
        if not self.current_edit_item or not self.current_edit_type:
            return
            
        try:
            values = {}
            item_values = tree.item(self.current_edit_item)['values']
            record_id = item_values[0]
            
            numeric_fields = [
                'quy_cach_mm', 'quy_cach_m', 'quy_cach_mic', 'cuon_cay', 'so_luong',
                'phi_sl', 'phi_keo', 'phi_mau', 'phi_size', 'phi_cat', 'don_gia_von',
                'don_gia_goc', 'thanh_tien_goc', 'don_gia_ban', 'thanh_tien_ban',
                'tien_coc', 'cong_no_khach', 'hoa_hong', 'tien_hoa_hong', 'loi_nhuan',
                'thanh_tien'
            ]
            
            for column in tree['columns']:
                if column in ['id', 'da_giao', 'da_tat_toan']:
                    continue
                    
                if column in ['thoi_gian', 'ngay_du_kien']:
                    date_value = self.edit_entries[column].get_date()
                    if column == 'thoi_gian':
                        current_time = datetime.now().time()
                        values[column] = datetime.combine(date_value, current_time)
                    else:
                        values[column] = date_value
                elif column in numeric_fields and column in self.edit_entries:
                    # Convert numeric values, removing commas
                    value = self.edit_entries[column].get()
                    values[column] = self.validate_float_input(value)
                else:
                    if column in self.edit_entries:
                        values[column] = self.edit_entries[column].get()
            
            try:
                if self.current_edit_type == 'bang_keo_in':
                    order = db_session.query(BangKeoInOrder).filter_by(id=record_id).first()
                elif self.current_edit_type == 'truc_in':
                    order = db_session.query(TrucInOrder).filter_by(id=record_id).first()
                else:  # bang_keo
                    order = db_session.query(BangKeoOrder).filter_by(id=record_id).first()
                    
                if order:
                    for field, value in values.items():
                        if field not in ['id', 'da_giao', 'da_tat_toan']:
                            setattr(order, field, value)
                
                if not order:
                    raise Exception("Không tìm thấy đơn hàng trong database")
                
                db_session.commit()
                
                # Update tree view
                tree_values = [record_id]
                for column in tree['columns'][1:]:
                    if column in ['thoi_gian']:
                        tree_values.append(values[column].strftime(self.DATE_FORMAT))
                    elif column in ['ngay_du_kien']:
                        tree_values.append(values[column].strftime(self.DATE_FORMAT))
                    elif column in ['da_giao', 'da_tat_toan']:
                        tree_values.append(item_values[tree['columns'].index(column)])
                    elif column in numeric_fields:
                        # Format numeric values with commas for display
                        tree_values.append(self.format_currency(values.get(column, 0)))
                    else:
                        tree_values.append(values.get(column, ''))
                
                tree.item(self.current_edit_item, values=tree_values)
                
                messagebox.showinfo("Thành công", "Đã cập nhật thông tin")
                edit_window.destroy()
                
            except Exception as e:
                db_session.rollback()
                raise Exception(f"Lỗi khi cập nhật database: {str(e)}")
                
        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi cập nhật: {str(e)}")
            
    def validate_float_input(self, value):
        try:
            if isinstance(value, str):
                value = value.replace(',', '')
            return float(value)
        except (ValueError, TypeError):
            return 0.0
            
    def format_currency_input(self, event):
        entry = event.widget
        try:
            value = float(entry.get().replace(',', ''))
            entry.delete(0, tk.END)
            entry.insert(0, f"{value:,.0f}")
        except ValueError:
            pass 

    def recalculate_edit_form(self, order_type):
        """Recalculate values in the edit form based on the order type"""
        try:
            if order_type == 'bang_keo_in':
                # Get values from edit entries
                don_gia_von = self.validate_float_input(self.edit_entries['don_gia_von'].get())
                phi_sl = self.validate_float_input(self.edit_entries['phi_sl'].get())
                phi_mau = self.validate_float_input(self.edit_entries['phi_mau'].get())
                phi_keo = self.validate_float_input(self.edit_entries['phi_keo'].get())
                phi_size = self.validate_float_input(self.edit_entries['phi_size'].get())
                phi_cat = self.validate_float_input(self.edit_entries['phi_cat'].get())
                so_luong = self.validate_float_input(self.edit_entries['so_luong'].get())
                don_gia_ban = self.validate_float_input(self.edit_entries['don_gia_ban'].get())
                tien_coc = self.validate_float_input(self.edit_entries['tien_coc'].get())
                hoa_hong = self.validate_float_input(self.edit_entries['hoa_hong'].get()) / 100
                cuon_cay = self.validate_float_input(self.edit_entries['cuon_cay'].get())
                quy_cach_m = self.validate_float_input(self.edit_entries['quy_cach_m'].get())

                # Calculate don_gia_goc
                if cuon_cay == 0 or quy_cach_m == 0:
                    don_gia_goc = 0
                else:
                    don_gia_goc = (don_gia_von + phi_sl + phi_mau + phi_keo + phi_size + phi_cat) / 90 * quy_cach_m / cuon_cay

                # Calculate other values
                thanh_tien_goc = don_gia_goc * so_luong
                thanh_tien_ban = don_gia_ban * so_luong
                cong_no_khach = thanh_tien_ban - tien_coc
                loi_nhuan = thanh_tien_ban - thanh_tien_goc
                tien_hoa_hong = loi_nhuan * hoa_hong

                # Update readonly fields
                self.update_readonly_field('don_gia_goc', don_gia_goc)
                self.update_readonly_field('thanh_tien_goc', thanh_tien_goc)
                self.update_readonly_field('thanh_tien_ban', thanh_tien_ban)
                self.update_readonly_field('cong_no_khach', cong_no_khach)
                self.update_readonly_field('tien_hoa_hong', tien_hoa_hong)
                self.update_readonly_field('loi_nhuan', loi_nhuan)

            else:  # truc_in
                # Get values
                so_luong = self.validate_float_input(self.edit_entries['so_luong'].get())
                don_gia_ban = self.validate_float_input(self.edit_entries['don_gia_ban'].get())
                don_gia_goc = self.validate_float_input(self.edit_entries['don_gia_goc'].get())
                hoa_hong = self.validate_float_input(self.edit_entries['hoa_hong'].get()) / 100

                # Calculate values
                thanh_tien = don_gia_goc * so_luong
                thanh_tien_ban = don_gia_ban * so_luong
                loi_nhuan = thanh_tien_ban - thanh_tien
                tien_hoa_hong = loi_nhuan * hoa_hong
                cong_no_khach = thanh_tien_ban

                # Update readonly fields
                self.update_readonly_field('thanh_tien', thanh_tien)
                self.update_readonly_field('thanh_tien_ban', thanh_tien_ban)
                self.update_readonly_field('cong_no_khach', cong_no_khach)
                self.update_readonly_field('tien_hoa_hong', tien_hoa_hong)
                self.update_readonly_field('loi_nhuan', loi_nhuan)

        except Exception as e:
            messagebox.showerror("Lỗi", f"Có lỗi xảy ra khi tính toán: {str(e)}")

    def update_readonly_field(self, field_name, value):
        """Update readonly field with formatted value"""
        if field_name in self.edit_entries:
            entry = self.edit_entries[field_name]
            entry.configure(state='normal')
            entry.delete(0, tk.END)
            entry.insert(0, self.format_currency(value))
            entry.configure(state='readonly')

    def validate_float_input(self, value):
        """Convert string input to float, handling commas"""
        try:
            if isinstance(value, str):
                value = value.replace(',', '')
            return float(value)
        except (ValueError, TypeError):
            return 0.0

    def format_currency(self, value):
        """Format currency value with thousand separators"""
        try:
            if value is None or value == '':
                return ''
            return f"{float(value):,.0f}"
        except (ValueError, TypeError):
            return str(value)

    def format_currency_input(self, event):
        """Format currency input when focus leaves the field"""
        entry = event.widget
        try:
            value = float(entry.get().replace(',', ''))
            entry.delete(0, tk.END)
            entry.insert(0, f"{value:,.0f}")
        except ValueError:
            pass