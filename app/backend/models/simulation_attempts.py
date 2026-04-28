from core.database import Base
from sqlalchemy import Column, DateTime, Integer, String


class Simulation_attempts(Base):
    __tablename__ = "simulation_attempts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    score = Column(Integer, nullable=False)
    grade = Column(String, nullable=False)
    errors_count = Column(Integer, nullable=False)
    errors_list = Column(String, nullable=False)
    duration_seconds = Column(Integer, nullable=False)
    procedure_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False)