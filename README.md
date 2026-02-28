# Intelligent Clinical Decision Support System (Handwritten + Digital Prescriptions)

An intelligent Clinical Decision Support System (CDSS) that performs automated prescription analysis and multi-disease risk prediction using Machine Learning.

The system supports both handwritten and digital prescriptions and provides disease risk predictions through a secure role-based web platform.

---

## Features

### Prescription Processing
- Handwritten prescription processing using OCR
- Clinical Named Entity Recognition (NER)
- Structured clinical data extraction
- Patient identity extraction

### Multi-Disease Prediction
Predicts risk for:

- Diabetes
- Obesity
- Cardiovascular Disease
- Liver Disease

Prediction Output:
- Disease prediction result
- Confidence score
- Risk probability
- Feature-based inputs

---

### Symptom-Based Prediction

- Multi-label symptom-based disease prediction
- Ranked disease probabilities
- Confidence-based warnings

---

### Role-Based Portals

- Admin Portal
- Receptionist Portal
- Doctor Portal
- Laboratory Portal
- Patient Portal

---

## Tech Stack

### Frontend
- React.js
- Tailwind CSS
- Axios
- Framer Motion

### Backend
- FastAPI
- Python
- REST API
- JWT Authentication

### Machine Learning
- Scikit-learn
- XGBoost
- LightGBM
- TensorFlow

### Data Processing
- Pandas
- NumPy

### OCR & NLP
- Google Cloud Vision API
- Clinical Named Entity Recognition
- Regex Extraction

### Database
- SQL Database
- SQLAlchemy ORM

---

## System Architecture

### Presentation Layer
Role-based portals:

- Admin
- Receptionist
- Doctor
- Laboratory
- Patient

### Application Layer

REST APIs for:

- Authentication
- Prescription processing
- Laboratory workflows
- Disease prediction

### Intelligence Layer

- OCR Processing
- Clinical NER
- Feature Engineering
- Machine Learning Models
- Symptom-based CDSS

### Data Layer

- Relational Database
- Model Storage

---

## Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/tasfiatasnim18/clinical-decision-support-system-handwritten-digital_Prescriptions-.git
cd CDSS
```

### 2️⃣ Create Virtual Environment

```bash
python -m venv venv
```
Activate:

Windows:
```code
venv\Scripts\activate
```
Linux/Mac:
```code
source venv/bin/activate
```

### 3️⃣ Install Dependencies
```code
pip install -r requirements.txt
```

### 4️⃣ Setup Environment Variables

Create .env file from example:
```code
cp .env.example .env
```
Fill values.

### 5️⃣ Run Backend
```code
uvicorn main:app --reload
```
Backend runs:
```code
http://127.0.0.1:8000
```

### 6️⃣ Run Frontend
```code
cd frontend
npm install
npm start
```

### API Documentation

FastAPI Swagger UI:
```code
http://127.0.0.1:8000/docs
```
### Machine Learning Models

Models Used:

-Random Forest
-XGBoost
-Logistic Regression
-LightGBM
-Neural Network

### Author

Tasfia Tasnim

LinkedIn:
https://linkedin.com/tasfiatasnim18

GitHub:
https://github.com/tasfiatasnim18
