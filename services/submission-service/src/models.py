from datetime import datetime
from sqlmodel import SQLModel, Field, Column , DateTime, func
from typing import Optional

class Submission(SQLModel, table=True):
    id : Optional[int] = Field(default=None, primary_key=True)
    user_id : str
    problem_id : str
    code : str
    language : str
    status : str = Field(default="pending")
    result : Optional[str] = None
    created_at : datetime = Field(
        sa_column = Column(DateTime(timezone=True), server_default=func.now())
    )
