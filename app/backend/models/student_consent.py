from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Student_consent(Base):
    __tablename__ = "student_consent"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    allow_tracking = Column(Boolean, nullable=False)
    student_name = Column(String, nullable=False)
    student_email = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False)