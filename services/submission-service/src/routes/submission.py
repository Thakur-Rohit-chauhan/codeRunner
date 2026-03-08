from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select
from ..database import get_session
from ..models import Submission
from producer import push_to_queue

router = APIRouter()

@router.post("/submit", response_model=Submission, status_code=201)
def create_submission(submission_data : Submission, 
                      session : Session = Depends(get_session)):

    submission_data.status = 'pending'
    session.add(submission_data)
    session.commit()
    session.refresh(submission_data)

    try:
        push_to_queue(submission_data.model_dump(mode='json'))
    except Exception as e:
        print(f"Queue error: {e}")

    return submission_data

@router.get("/{submission_id}")
def get_submission(submission_id : int , session : Session = Depends(get_session)):
    submission = session.get(Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="submission detail not found.")
    return submission