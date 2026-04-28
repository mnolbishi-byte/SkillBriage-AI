from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Instructor_notes(Base):
    __tablename__ = "instructor_notes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    student_user_id = Column(String, nullable=False)
    note_text = Column(String, nullable=False)
    note_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)