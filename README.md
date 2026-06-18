🧠 Mental Health LLM - AI-Powered Depression Level Prediction  

This project utilizes *Large Language Models (LLMs)* and *deep learning* to analyze textual inputs and predict *depression levels. The system helps assess mental health by classifying text into categories such as **mild, moderate, severe, and minimal depression*.  



🌟 Project Overview  
Mental health is crucial, and early detection of depressive symptoms can lead to timely intervention. This project integrates *BERT-based NLP models* with *LLMs* to analyze user text and provide *mental health insights*.  

🔹 Input: User-provided text describing thoughts or emotions  
🔹 Processing: NLP-based sentiment & depression level analysis  
🔹 Output: Predicted depression level (Minimal, Mild, Moderate, Severe)  



⚡ Key Features
✅ LLM-powered text analysis for mental health insights 
✅ Fine-tuned BERT model for depression level classification
✅ MERN stack frontend for user interaction
✅ Groq API for efficient mental health predictions 
✅ Secure API integration with CORS handling 
✅ Scalable and deployable on cloud platforms



 🔥 Tech Stack
- Machine Learning: BERT, Transformers, NLP  
- Backend: Node.js, Express.js, Groq API  
- Frontend: React, Axios, Tailwind CSS  
- Database: MongoDB  
- Deployment: Hugging Face, AWS/GCP  

---

 📂 Project Structure
 📁 Mental-Health-LLM
├── 📂 backend/ # Express.js server & API
├── 📂 frontend/ # React.js UI for user interaction
├── 📂 models/ # NLP model for depression detection
├── 📂 data/ # Processed mental health text dataset
├── 📜 requirements.txt # Backend dependencies
├── 📜 server.js # Express server
├── 📜 model.py # Depression prediction model
├── 📜 README.md # Project documentation

## 🚀 How to Run

You need to run 3 separate terminals for the full application.

### 1. Python Backend (Model Service)
Allows the BERT model to run.
```bash
cd mental-health-prediction
# Activate your virtual environment if you have one
# .\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```
*Runs on port 8000*

### 2. Node Backend (API Server)
Handles requests and routes to Groq or Python backend.
```bash
cd mental-health-prediction
npm install
node server.js
```
*Runs on port 5000*

### 3. React Frontend (UI)
The user interface.
```bash
cd mental-health-app
npm install
npm start
```
*Runs on port 3000*

