from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper function to convert ObjectId to string
def serialize_doc(doc):
    """Recursively convert ObjectId to string in nested documents"""
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == '_id' and isinstance(value, ObjectId):
                result['id'] = str(value)
            elif isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(item) if isinstance(item, (dict, ObjectId)) else item for item in value]
            else:
                result[key] = value
        return result
    elif isinstance(doc, ObjectId):
        return str(doc)
    elif isinstance(doc, list):
        return [serialize_doc(item) if isinstance(item, (dict, ObjectId)) else item for item in doc]
    else:
        return doc

# Define Models
class Topic(BaseModel):
    name: str
    difficulty: str  # 'weak' or 'strong'
    hours_needed: float

class Subject(BaseModel):
    name: str
    exam_date: str  # ISO format date
    topics: List[Topic]
    color: Optional[str] = "#4A90E2"

class StudyPlanCreate(BaseModel):
    subjects: List[Subject]
    daily_hours: float
    start_date: Optional[str] = None  # ISO format date

class StudySession(BaseModel):
    subject: str
    topic: str
    date: str
    start_time: str
    end_time: str
    duration: float
    completed: bool = False

class StudyPlan(BaseModel):
    id: Optional[str] = None
    subjects: List[Subject]
    daily_hours: float
    start_date: str
    sessions: List[StudySession]
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class UpdateSessionStatus(BaseModel):
    date: str
    subject: str
    topic: str
    completed: bool

# Scheduling Algorithm
def generate_study_schedule(subjects: List[Subject], daily_hours: float, start_date: str) -> List[StudySession]:
    """
    Smart scheduling algorithm that considers:
    - Exam dates (prioritize closer exams)
    - Weak vs strong topics (more time for weak topics)
    - Spaced repetition principles
    """
    sessions = []
    start = datetime.fromisoformat(start_date)
    
    # Calculate total study time needed and prioritize subjects
    subject_data = []
    for subject in subjects:
        exam_date = datetime.fromisoformat(subject.exam_date)
        days_until_exam = (exam_date - start).days
        
        total_hours = sum(topic.hours_needed for topic in subject.topics)
        weak_topics = [t for t in subject.topics if t.difficulty == 'weak']
        strong_topics = [t for t in subject.topics if t.difficulty == 'strong']
        
        # Allocate more time to weak topics (1.5x)
        weak_hours = sum(t.hours_needed * 1.5 for t in weak_topics)
        strong_hours = sum(t.hours_needed for t in strong_topics)
        adjusted_total = weak_hours + strong_hours
        
        subject_data.append({
            'subject': subject,
            'exam_date': exam_date,
            'days_until_exam': days_until_exam,
            'total_hours': adjusted_total,
            'weak_topics': weak_topics,
            'strong_topics': strong_topics,
            'priority': 1 / max(days_until_exam, 1)  # Higher priority for closer exams
        })
    
    # Sort by priority (closer exams first)
    subject_data.sort(key=lambda x: x['priority'], reverse=True)
    
    # Generate schedule day by day
    current_date = start
    topic_schedules = {}  # Track when each topic is studied for spaced repetition
    
    for subject_info in subject_data:
        subject = subject_info['subject']
        exam_date = subject_info['exam_date']
        
        # Schedule weak topics first with more time
        all_topics = subject_info['weak_topics'] + subject_info['strong_topics']
        
        for topic in all_topics:
            multiplier = 1.5 if topic.difficulty == 'weak' else 1.0
            hours_to_allocate = topic.hours_needed * multiplier
            
            # Schedule topic across multiple days with spaced repetition
            sessions_for_topic = max(1, int(hours_to_allocate / (daily_hours / 2)))  # At least 2 topics per day
            hours_per_session = hours_to_allocate / sessions_for_topic
            
            for session_num in range(sessions_for_topic):
                # Find next available slot
                while current_date >= exam_date:
                    current_date -= timedelta(days=1)  # Move back if we've passed exam
                
                # Calculate time slot
                start_hour = 9 + (len([s for s in sessions if s.date == current_date.date().isoformat()]) * hours_per_session)
                if start_hour + hours_per_session > 21:  # Don't schedule after 9 PM
                    current_date += timedelta(days=1)
                    start_hour = 9
                
                start_time = f"{int(start_hour):02d}:{int((start_hour % 1) * 60):02d}"
                end_hour = start_hour + hours_per_session
                end_time = f"{int(end_hour):02d}:{int((end_hour % 1) * 60):02d}"
                
                session = StudySession(
                    subject=subject.name,
                    topic=topic.name,
                    date=current_date.date().isoformat(),
                    start_time=start_time,
                    end_time=end_time,
                    duration=hours_per_session,
                    completed=False
                )
                sessions.append(session)
                
                # Space out sessions for the same topic
                if session_num < sessions_for_topic - 1:
                    current_date += timedelta(days=2)  # Space repetition
    
    # Sort sessions by date
    sessions.sort(key=lambda x: (x.date, x.start_time))
    
    return sessions

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Study Scheduler API"}

@api_router.post("/study-plans", response_model=Dict)
async def create_study_plan(plan_data: StudyPlanCreate):
    try:
        # Set start date to today if not provided
        start_date = plan_data.start_date or datetime.utcnow().date().isoformat()
        
        # Generate schedule
        sessions = generate_study_schedule(
            plan_data.subjects,
            plan_data.daily_hours,
            start_date
        )
        
        # Create study plan
        study_plan = StudyPlan(
            subjects=plan_data.subjects,
            daily_hours=plan_data.daily_hours,
            start_date=start_date,
            sessions=sessions
        )
        
        # Save to database
        plan_dict = study_plan.dict(exclude={'id'})
        result = await db.study_plans.insert_one(plan_dict)
        plan_dict['id'] = str(result.inserted_id)
        
        # Ensure all nested objects are JSON serializable
        return serialize_doc(plan_dict)
    except Exception as e:
        logging.error(f"Error creating study plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/study-plans", response_model=List[Dict])
async def get_study_plans():
    try:
        plans = await db.study_plans.find().sort('created_at', -1).to_list(100)
        for plan in plans:
            plan['id'] = str(plan['_id'])
            del plan['_id']
        return plans
    except Exception as e:
        logging.error(f"Error fetching study plans: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/study-plans/{plan_id}", response_model=Dict)
async def get_study_plan(plan_id: str):
    try:
        plan = await db.study_plans.find_one({'_id': ObjectId(plan_id)})
        if not plan:
            raise HTTPException(status_code=404, detail="Study plan not found")
        plan['id'] = str(plan['_id'])
        del plan['_id']
        return plan
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        logging.error(f"Error fetching study plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/study-plans/{plan_id}/sessions", response_model=Dict)
async def update_session_status(plan_id: str, update_data: UpdateSessionStatus):
    try:
        plan = await db.study_plans.find_one({'_id': ObjectId(plan_id)})
        if not plan:
            raise HTTPException(status_code=404, detail="Study plan not found")
        
        # Update session completion status
        for session in plan['sessions']:
            if (session['date'] == update_data.date and 
                session['subject'] == update_data.subject and 
                session['topic'] == update_data.topic):
                session['completed'] = update_data.completed
        
        # Update in database
        await db.study_plans.update_one(
            {'_id': ObjectId(plan_id)},
            {'$set': {'sessions': plan['sessions']}}
        )
        
        plan['id'] = str(plan['_id'])
        del plan['_id']
        return plan
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        logging.error(f"Error updating session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/study-plans/{plan_id}")
async def delete_study_plan(plan_id: str):
    try:
        result = await db.study_plans.delete_one({'_id': ObjectId(plan_id)})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Study plan not found")
        return {"message": "Study plan deleted successfully"}
    except Exception as e:
        logging.error(f"Error deleting study plan: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
