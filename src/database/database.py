from sqlalchemy import create_engine, Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, object_session
from datetime import datetime
from sqlalchemy import event
import os

Base = declarative_base()

# Thêm hàm helper để to ID
def generate_order_id(prefix, session, table_class):
    current_date = datetime.now()
    month = current_date.strftime("%m")
    year = current_date.strftime("%y")
    
    # Tìm số thứ tự cao nhất trong tháng hiện tại
    base_prefix = f"{prefix}-{month}-{year}"
    latest_order = (
        session.query(table_class)
        .filter(table_class.id.like(f"{base_prefix}%"))
        .order_by(table_class.id.desc())
        .first()
    )
    
    if latest_order:
        # Lấy số thứ tự từ ID cuối cùng và tăng lên 1
        last_sequence = int(latest_order.id.split('-')[-1])
        new_sequence = str(last_sequence + 1).zfill(3)
    else:
        new_sequence = "001"
    
    return f"{base_prefix}-{new_sequence}"

class BangKeoInOrder(Base):
    __tablename__ = 'bang_keo_in_orders'

    id = Column(String(20), primary_key=True)
    thoi_gian = Column(DateTime, default=datetime.now)
    ten_hang = Column(String(255), nullable=False)
    ngay_du_kien = Column(Date, nullable=False)
    
    # Quy cách
    quy_cach_mm = Column(Float)
    quy_cach_m = Column(Float)
    quy_cach_mic = Column(Float)
    cuon_cay = Column(Float)
    
    # Số lượng và phí
    so_luong = Column(Float, nullable=False)
    phi_sl = Column(Float, default=0)
    mau_keo = Column(String(100))
    phi_keo = Column(Float, default=0)
    mau_sac = Column(String(100))
    phi_mau = Column(Float, default=0)
    phi_size = Column(Float, default=0)
    phi_cat = Column(Float, default=0)
    
    # Giá cả
    don_gia_von = Column(Float, default=0)
    don_gia_goc = Column(Float, default=0)
    thanh_tien_goc = Column(Float, default=0)
    don_gia_ban = Column(Float, nullable=False)
    thanh_tien_ban = Column(Float, default=0)
    tien_coc = Column(Float, default=0)
    cong_no_khach = Column(Float, default=0)
    
    # CTV và hoa hồng
    ctv = Column(String(100))
    hoa_hong = Column(Float, default=0)
    tien_hoa_hong = Column(Float, default=0)
    
    # Thông tin thêm
    loi_giay = Column(String(100))
    thung_bao = Column(String(100))
    loi_nhuan = Column(Float, default=0)
    tien_ship = Column(Float, default=0)
    loi_nhuan_rong = Column(Float, default=0)

    # Trạng thái đơn hàng
    da_giao = Column(Boolean, default=False)
    da_tat_toan = Column(Boolean, default=False)

class TrucInOrder(Base):
    __tablename__ = 'truc_in_orders'

    id = Column(String(20), primary_key=True)
    thoi_gian = Column(DateTime, default=datetime.now)
    ten_hang = Column(String(255), nullable=False)
    ngay_du_kien = Column(Date, nullable=False)
    
    # Thông tin cơ bản
    quy_cach = Column(String(100))
    so_luong = Column(Float, nullable=False)
    mau_sac = Column(String(100))
    mau_keo = Column(String(100))
    
    # Giá cả
    don_gia_goc = Column(Float, default=0)
    thanh_tien = Column(Float, default=0)
    don_gia_ban = Column(Float, nullable=False)
    thanh_tien_ban = Column(Float, default=0)
    cong_no_khach = Column(Float, default=0)
    
    # CTV và hoa hồng
    ctv = Column(String(100))
    hoa_hong = Column(Float, default=0)
    tien_hoa_hong = Column(Float, default=0)
    loi_nhuan = Column(Float, default=0)
    tien_ship = Column(Float, default=0)
    loi_nhuan_rong = Column(Float, default=0)

    # Trạng thái đơn hàng
    da_giao = Column(Boolean, default=False)
    da_tat_toan = Column(Boolean, default=False)

class BangKeoOrder(Base):
    __tablename__ = 'bang_keo_orders'

    id = Column(String(20), primary_key=True)
    thoi_gian = Column(DateTime, default=datetime.now)
    ten_hang = Column(String(255), nullable=False)
    ngay_du_kien = Column(Date, nullable=False)
    
    # Thông tin cơ bản
    quy_cach = Column(String(100))  # In KG
    so_luong = Column(Float, nullable=False)
    mau_sac = Column(String(100))
    
    # Giá cả
    don_gia_goc = Column(Float, default=0)
    thanh_tien = Column(Float, default=0)
    don_gia_ban = Column(Float, nullable=False)
    thanh_tien_ban = Column(Float, default=0)
    cong_no_khach = Column(Float, default=0)
    
    # CTV và hoa hồng
    ctv = Column(String(100))
    hoa_hong = Column(Float, default=0)
    tien_hoa_hong = Column(Float, default=0)
    loi_nhuan = Column(Float, default=0)
    tien_ship = Column(Float, default=0)
    loi_nhuan_rong = Column(Float, default=0)

    # Trạng thái đơn hàng
    da_giao = Column(Boolean, default=False)
    da_tat_toan = Column(Boolean, default=False)

# Thêm event listeners để tự động tạo ID
@event.listens_for(BangKeoInOrder, 'before_insert')
def set_bang_keo_in_id(mapper, connection, target):
    if not target.id:
        session = object_session(target)
        target.id = generate_order_id("BK", session, BangKeoInOrder)

@event.listens_for(TrucInOrder, 'before_insert')
def set_truc_in_id(mapper, connection, target):
    if not target.id:
        session = object_session(target)
        target.id = generate_order_id("TI", session, TrucInOrder)

@event.listens_for(BangKeoOrder, 'before_insert')
def set_bang_keo_id(mapper, connection, target):
    if not target.id:
        session = object_session(target)
        target.id = generate_order_id("B", session, BangKeoOrder)

def init_db(database_url):
    """Initialize the database and create all tables"""
    engine = create_engine(
        database_url,
        pool_size=10,
        max_overflow=20,
        pool_timeout=60,
        pool_recycle=1800,
        pool_pre_ping=True,
        echo=False
    )
    
    Base.metadata.create_all(engine)
    return engine

def get_session(engine):
    """Create a new session"""
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Wrap the session in a try-except
    try:
        return session
    except:
        session.rollback()
        raise 