from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
tokenizer = AutoTokenizer.from_pretrained("VeenaSree/mentalhealth-BERT")
model = AutoModelForSequenceClassification.from_pretrained("VeenaSree/mentalhealth-BERT")

text = input()
inputs = tokenizer(text, return_tensors="pt")

with torch.no_grad():
    outputs = model(**inputs)
    
logits = outputs.logits
prediction = torch.argmax(logits, dim=1).item()
labels = ["minimum", "mild", "moderate", "severe"]
print({"prediction": labels[prediction]})