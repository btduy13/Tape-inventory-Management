import pandas as pd
import os
from src.database.database import BangKeoInOrder, TrucInOrder, get_session, init_db
from datetime import datetime, timedelta
import numpy as np
import logging

def export_template(file_path, order_type):
    """Export an Excel template for data entry."""
    if order_type == 'bang_keo_in':
        columns = [
            'Thời gian', 'Tên hàng', 'Ngày dự kiến', 'Quy cách (mm)', 'Quy cách (m)', 'Quy cách (mic)',
            'Cuộn/1 cây', 'Số lượng', 'Phí số lượng', 'Màu keo', 'Phí keo', 'Màu sắc', 'Phí màu', 'Phí size',
            'Phí cắt', 'Đơn giá vốn', 'Đơn giá gốc', 'Thành tiền gốc', 'Đơn giá bán', 'Thành tiền bán', 'Tiền cọc',
            'Công nợ khách', 'CTV', 'Hoa hồng', 'Tiền hoa hồng', 'Lõi giấy', 'Thùng/Bao', 'Lợi nhuận', 'Đã giao', 'Đã tất toán'
        ]
    else:  # truc_in
        columns = [
            'Thời gian', 'Tên hàng', 'Ngày dự kiến', 'Quy cách', 'Số lượng', 'Màu sắc', 'Màu keo',
            'Đơn giá gốc', 'Thành tiền', 'Đơn giá bán', 'Thành tiền bán', 'Công nợ khách', 'CTV', 'Hoa hồng',
            'Tiền hoa hồng', 'Lợi nhuận', 'Đã giao', 'Đã tất toán'
        ]

    df = pd.DataFrame(columns=columns)
    df.to_excel(file_path, index=False, engine='openpyxl')
    
    # Use a simple string without Vietnamese characters for logging
    logging.info(f"Template exported successfully to: {file_path}")

def convert_to_float(value):
    """Convert a value to float, handling NaN and invalid values"""
    try:
        if pd.isna(value):
            return 0.0
        return float(value)
    except (ValueError, TypeError):
        return 0.0

def convert_to_bool(value):
    """Convert various values to boolean"""
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.lower() in ['true', 'yes', '1', 'có', 'co', 'x']
    if isinstance(value, (int, float)):
        return bool(value)
    return False

def convert_to_date(value, order_date=None):
    """Convert various date formats to datetime with default handling"""
    if pd.isna(value):
        # If no date provided, use order_date + 14 days
        if order_date:
            return order_date + timedelta(days=14)
        return datetime.now() + timedelta(days=14)
    
    if isinstance(value, datetime):
        return value
        
    try:
        return pd.to_datetime(value)
    except:
        if order_date:
            return order_date + timedelta(days=14)
        return datetime.now() + timedelta(days=14)

def import_data(file_path, order_type, db_session):
    """Import data from an Excel file and save to the database."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"The file {file_path} does not exist.")

    df = pd.read_excel(file_path)
    errors = []

    try:
        if order_type == 'bang_keo_in':
            # Get current date for ID generation
            current_date = datetime.now()
            # Get the highest ID number for today
            prefix = f"BK-{current_date.strftime('%m-%y')}"
            existing_orders = db_session.query(BangKeoInOrder).filter(
                BangKeoInOrder.id.like(f"{prefix}%")
            ).all()
            
            # Find the highest number
            highest_num = 0
            for order in existing_orders:
                try:
                    num = int(order.id.split('-')[-1])
                    highest_num = max(highest_num, num)
                except (ValueError, IndexError):
                    continue
            
            for idx, row in df.iterrows():
                try:
                    # Generate new unique ID
                    highest_num += 1
                    new_id = f"{prefix}-{highest_num:03d}"
                    
                    # Convert order time first
                    order_time = convert_to_date(row.get('Thời gian', datetime.now()))
                    
                    order = BangKeoInOrder(
                        id=new_id,
                        thoi_gian=order_time,
                        ten_hang=str(row['Tên hàng']),
                        ngay_du_kien=convert_to_date(row.get('Ngày dự kiến'), order_time),
                        quy_cach_mm=convert_to_float(row.get('Quy cách (mm)')),
                        quy_cach_m=convert_to_float(row.get('Quy cách (m)')),
                        quy_cach_mic=convert_to_float(row.get('Quy cách (mic)')),
                        cuon_cay=convert_to_float(row.get('Cuộn/1 cây')),
                        so_luong=convert_to_float(row['Số lượng']),
                        phi_sl=convert_to_float(row.get('Phí số lượng')),
                        mau_keo=str(row.get('Màu keo', '')),
                        phi_keo=convert_to_float(row.get('Phí keo')),
                        mau_sac=str(row.get('Màu sắc', '')),
                        phi_mau=convert_to_float(row.get('Phí màu')),
                        phi_size=convert_to_float(row.get('Phí size')),
                        phi_cat=convert_to_float(row.get('Phí cắt')),
                        don_gia_von=convert_to_float(row.get('Đơn giá vốn')),
                        don_gia_goc=convert_to_float(row.get('Đơn giá gốc')),
                        thanh_tien_goc=convert_to_float(row.get('Thành tiền gốc')),
                        don_gia_ban=convert_to_float(row['Đơn giá bán']),
                        thanh_tien_ban=convert_to_float(row.get('Thành tiền bán')),
                        tien_coc=convert_to_float(row.get('Tiền cọc')),
                        cong_no_khach=convert_to_float(row.get('Công nợ khách')),
                        ctv=str(row.get('CTV', '')),
                        hoa_hong=convert_to_float(row.get('Hoa hồng')),
                        tien_hoa_hong=convert_to_float(row.get('Tiền hoa hồng')),
                        loi_giay=str(row.get('Lõi giấy', '')),
                        thung_bao=str(row.get('Thùng/Bao', '')),
                        loi_nhuan=convert_to_float(row.get('Lợi nhuận')),
                        da_giao=convert_to_bool(row.get('Đã giao')),
                        da_tat_toan=convert_to_bool(row.get('Đã tất toán'))
                    )
                    db_session.add(order)
                except Exception as e:
                    errors.append(f"Error in row {idx + 2}: {str(e)}")
                    
        else:  # truc_in
            # Get current date for ID generation
            current_date = datetime.now()
            # Get the highest ID number for today
            prefix = f"TI-{current_date.strftime('%m-%y')}"
            existing_orders = db_session.query(TrucInOrder).filter(
                TrucInOrder.id.like(f"{prefix}%")
            ).all()
            
            # Find the highest number
            highest_num = 0
            for order in existing_orders:
                try:
                    num = int(order.id.split('-')[-1])
                    highest_num = max(highest_num, num)
                except (ValueError, IndexError):
                    continue
                    
            for idx, row in df.iterrows():
                try:
                    # Generate new unique ID
                    highest_num += 1
                    new_id = f"{prefix}-{highest_num:03d}"
                    
                    # Convert order time first
                    order_time = convert_to_date(row.get('Thời gian', datetime.now()))
                    
                    order = TrucInOrder(
                        id=new_id,
                        thoi_gian=order_time,
                        ten_hang=str(row['Tên hàng']),
                        ngay_du_kien=convert_to_date(row.get('Ngày dự kiến'), order_time),
                        quy_cach=str(row.get('Quy cách', '')),
                        so_luong=convert_to_float(row['Số lượng']),
                        mau_sac=str(row.get('Màu sắc', '')),
                        mau_keo=str(row.get('Màu keo', '')),
                        don_gia_goc=convert_to_float(row.get('Đơn giá gốc')),
                        thanh_tien=convert_to_float(row.get('Thành tiền')),
                        don_gia_ban=convert_to_float(row['Đơn giá bán']),
                        thanh_tien_ban=convert_to_float(row.get('Thành tiền bán')),
                        cong_no_khach=convert_to_float(row.get('Công nợ khách')),
                        ctv=str(row.get('CTV', '')),
                        hoa_hong=convert_to_float(row.get('Hoa hồng')),
                        tien_hoa_hong=convert_to_float(row.get('Tiền hoa hồng')),
                        loi_nhuan=convert_to_float(row.get('Lợi nhuận')),
                        da_giao=convert_to_bool(row.get('Đã giao')),
                        da_tat_toan=convert_to_bool(row.get('Đã tất toán'))
                    )
                    db_session.add(order)
                except Exception as e:
                    errors.append(f"Error in row {idx + 2}: {str(e)}")

        if errors:
            db_session.rollback()
            error_message = "\n".join(errors)
            raise Exception(f"Errors occurred during import:\n{error_message}")
            
        db_session.commit()
        logging.info("Data imported and saved to the database successfully")
        
    except Exception as e:
        db_session.rollback()
        raise Exception(f"Import failed: {str(e)}")