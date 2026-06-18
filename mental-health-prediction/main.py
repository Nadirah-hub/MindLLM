# to start backend use the following command:  'uvicorn main:app --reload'


from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import torch
import uvicorn
from transformers import AutoTokenizer, AutoModelForSequenceClassification

app = FastAPI()

# Allow all origins, methods, and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tokenizer = AutoTokenizer.from_pretrained("VeenaSree/mentalhealth-BERT")
model = AutoModelForSequenceClassification.from_pretrained("VeenaSree/mentalhealth-BERT")

from groq import Groq

import os

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
labels = ["minimum", "mild", "moderate", "severe"]


@app.post("/predict")
async def predict(request: Request):
    data = await request.json()
    print(data)
    response=""
    
    if(data["modelName"]=="gemma-7b-it"):
        completion = client.chat.completions.create(
            model="gemma-7b-it",
            messages=[
                {
                    "role": "system",
                    "content": "YOU ARE A MENTAL HEALTH PREDICTION LLM RESPOND ONLY USING THE FOLLOWING WORDS IN ONE WORD. YOUR RESPONSE MUST BE WITHIN THIS LIST ONLY -[minimum, mild, moderate, severe]"
                },
                {
                    "role": "user",
                    "content": data['inputText']
                }
            ],
            temperature=0.1,
            max_tokens=1,
            top_p=1,
            stream=True,
            stop=None,
        )
        for chunk in completion:
            response+=chunk.choices[0].delta.content or ""
        return {"prediction": response}
    
    elif(data["modelName"]=="mixtral-8x7b-32768"):
        completion = client.chat.completions.create(
            model="mixtral-8x7b-32768",
            messages=[
                {
                    "role": "system",
                    "content": "YOU ARE A MENTAL HEALTH PREDICTION LLM RESPOND ONLY USING THE FOLLOWING WORDS IN ONE WORD. YOUR RESPONSE MUST BE WITHIN THIS LIST ONLY -[minimum, mild, moderate, severe]"
                },
                {
                    "role": "user",
                    "content": data['inputText']
                }
            ],
            temperature=0.1,
            max_tokens=70,
            top_p=1,
            stream=True,
            stop=None,
        )
        for chunk in completion:
            response+=chunk.choices[0].delta.content or ""
        return {"prediction": response}

    elif(data["modelName"]=="llama3-70b-8192"):
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[
                {
                    "role": "system",
                    "content": "YOU ARE A MENTAL HEALTH PREDICTION LLM RESPOND ONLY USING THE FOLLOWING WORDS IN ONE WORD.YOUR RESPONSE MUST BE WITHIN THIS LIST ONLY  -[minimum, mild, moderate, severe]"
                },
                {
                    "role": "user",
                    "content": data['inputText']
                }
            ],
            temperature=0.1,
            max_tokens=8,
            top_p=1,
            stream=True,
            stop=None,
        )
        for chunk in completion:
            response+=chunk.choices[0].delta.content or ""
        return {"prediction": response}

    elif(data["modelName"]=="bert"):
        text = data['inputText']+"."
        inputs = tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            outputs = model(**inputs)
        logits = outputs.logits
        prediction = torch.argmax(logits, dim=1).item()
        print(prediction)
        return {"prediction": labels[prediction]}

if __name__ == "__main__":    
    uvicorn.run(app, host="0.0.0.0", port=8000)
