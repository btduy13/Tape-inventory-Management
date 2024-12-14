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

# Khởi tạo backup database
def init_backup_db():
    backup_dir = "backup"
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
    backup_db_path = os.path.join(backup_dir, "local_backup.db")
    backup_url = f"sqlite:///{backup_db_path}"
    backup_engine = create_engine(backup_url)
    Base.metadata.create_all(backup_engine)
    return backup_engine

# Tạo session cho backup database
def get_backup_session(backup_engine):
    BackupSession = sessionmaker(bind=backup_engine)
    return BackupSession()

# Hàm đồng bộ dữ liệu
def sync_to_backup(target, backup_session, table_class):
    try:
        # Kiểm tra xem bản ghi đã tồn tại trong backup chưa
        existing_record = backup_session.query(table_class).filter_by(id=target.id).first()
        
        if existing_record:
            # Cập nhật bản ghi hiện có
            for column in table_class.__table__.columns:
                value = getattr(target, column.name)
                # Chuyển đổi chuỗi ngày tháng thành đối tượng datetime
                if column.name in ['thoi_gian', 'ngay_du_kien'] and isinstance(value, str):
                    try:
                        value = datetime.strptime(value, '%d/%m/%Y')
                    except ValueError:
                        try:
                            value = datetime.strptime(value, '%d/%m/%Y %H:%M:%S')
                        except ValueError:
                            continue
                setattr(existing_record, column.name, value)
        else:
            # Tạo bản ghi mới
            backup_record = table_class()
            for column in table_class.__table__.columns:
                value = getattr(target, column.name)
                # Chuyển đổi chuỗi ngày tháng thành đối tượng datetime
                if column.name in ['thoi_gian', 'ngay_du_kien'] and isinstance(value, str):
                    try:
                        value = datetime.strptime(value, '%d/%m/%Y')
                    except ValueError:
                        try:
                            value = datetime.strptime(value, '%d/%m/%Y %H:%M:%S')
                        except ValueError:
                            continue
                setattr(backup_record, column.name, value)
            backup_session.add(backup_record)
        
        backup_session.commit()
    except Exception as e:
        backup_session.rollback()
        print(f"Lỗi khi sao lưu: {str(e)}")
        print(f"[SQL: {e.__cause__}]" if e.__cause__ else "")

def init_db(database_url):
    """Initialize the database and create all tables"""
    if database_url.startswith('sqlite:'):
        engine = create_engine(database_url)
    else:
        # For PostgreSQL, we need to set some additional parameters
        engine = create_engine(
            database_url,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800
        )
    
    Base.metadata.create_all(engine)
    
    # Khởi tạo backup database
    backup_engine = init_backup_db()
    backup_session = get_backup_session(backup_engine)
    
    # Thêm event listeners cho việc đồng bộ
    @event.listens_for(BangKeoInOrder, 'after_insert')
    @event.listens_for(BangKeoInOrder, 'after_update')
    def sync_bang_keo_in(mapper, connection, target):
        sync_to_backup(target, backup_session, BangKeoInOrder)
        
    @event.listens_for(TrucInOrder, 'after_insert')
    @event.listens_for(TrucInOrder, 'after_update')
    def sync_truc_in(mapper, connection, target):
        sync_to_backup(target, backup_session, TrucInOrder)
    
    return engine

def get_session(engine):
    """Create a new session"""
    Session = sessionmaker(bind=engine)
    return Session() 