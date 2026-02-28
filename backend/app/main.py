#!/usr/bin/env python
# coding: utf-8

# In[ ]:


from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from home import app as home_app
from admin import app as admin_app
from receptionist import router as receptionist_router
from lab import router as lab_router
from doctor import app as doctor_app
from patient import app as patient_app

app = FastAPI(title="MedAI MASTER API")

# ✅ CORS MUST BE HERE
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/api/home", home_app)
app.mount("/api/admin", admin_app)
app.include_router(receptionist_router)
app.include_router(lab_router)
app.mount("/api/doctor", doctor_app)
app.mount("/api/patient", patient_app)

#app.mount("/api/receptionist", receptionist_app)