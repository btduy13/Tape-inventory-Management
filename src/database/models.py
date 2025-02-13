from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class DonHang(Base):
    __tablename__ = 'don_hang'

    id = Column(Integer, primary_key=True)
    ngay_dat = Column(DateTime, default=datetime.now)
    ngay_du_kien = Column(DateTime)
    trang_thai = Column(String)
    da_giao = Column(Boolean, default=False)
    da_tat_toan = Column(Boolean, default=False)
    ghi_chu = Column(String)
    
    # Relationship with ChiTietDonHang
    chi_tiet = relationship("ChiTietDonHang", back_populates="don_hang")

class ChiTietDonHang(Base):
    __tablename__ = 'chi_tiet_don_hang'

    id = Column(Integer, primary_key=True)
    don_hang_id = Column(Integer, ForeignKey('don_hang.id'))
    ten_hang = Column(String)
    so_luong = Column(Integer)
    don_gia = Column(Float)
    thanh_tien = Column(Float)
    quy_cach = Column(String)
    mau_sac = Column(String)
    mau_keo = Column(String)
    
    # Relationship with DonHang
    don_hang = relationship("DonHang", back_populates="chi_tiet")

    def __repr__(self):
        return f"<ChiTietDonHang(id={self.id}, ten_hang='{self.ten_hang}', so_luong={self.so_luong})>" 