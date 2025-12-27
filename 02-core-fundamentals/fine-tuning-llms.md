# Fine-Tuning Gemini Models

## Agenda

This guide teaches you how to **fine-tune Gemini models** using the Google Generative AI SDK.

**Why fine-tune?**  
While Gemini models are powerful out-of-the-box, fine-tuning allows you to:
- **Specialize** the model for your domain (e.g., customer support, legal, medical)
- **Improve consistency** in tone, style, and formatting
- **Boost performance** on specific tasks (e.g., classification, structured responses)
- **Reduce prompt engineering** complexity — the model "remembers" your desired behavior
- **Handle niche knowledge** not present in the base training data

Fine-tuning is ideal when you have a repeatable task with clear input-output patterns and sufficient high-quality examples.

**What you will learn:**
- Preparing and uploading training data
- Discovering tunable models and launching a tuning job
- Monitoring progress and reviewing metrics
- Using your tuned model for inference and chat
- Managing (listing, updating, deleting) tuned models
- Best practices for data quality, training, and cost

By the end, you'll be able to create highly specialized Gemini models tailored to your use case.

## Table of Contents

1. [Project Setup](#project-setup)
2. [Prepare Training Data](#prepare-training-data)
3. [Create Tuned Model](#create-tuned-model)
4. [Use Tuned Model](#use-tuned-model)
5. [Manage Tuned Models](#manage-tuned-models)

## Project Setup

### Install the SDK
```bash
pip install -U -q "google-genai==1.7.0"
```

### Import Required Modules
```python
from google import genai
from google.genai import types
import json
import time
```

### Configure API Key
```python
client = genai.Client(api_key="YOUR_GOOGLE_API_KEY")
```

## Prepare Training Data

Fine-tuning uses supervised data in **JSONL format** (one JSON object per line) with `text_input` and `output` fields.

### Example Dataset (Customer Support Bot)
```python
training_data = [
    {
        "text_input": "How do I reset my password?",
        "output": "To reset your password: 1) Click 'Forgot Password' on login page 2) Enter your email 3) Check your email for reset link 4) Create new password"
    },
    {
        "text_input": "What are your business hours?",
        "output": "Our customer support is available Monday-Friday 9 AM to 6 PM EST, and Saturday 10 AM to 4 PM EST. We're closed on Sundays."
    },
    {
        "text_input": "How long does shipping take?",
        "output": "Standard shipping takes 5-7 business days. Express shipping takes 2-3 business days. Free shipping on orders over $50."
    },
    {
        "text_input": "Can I cancel my order?",
        "output": "Yes, you can cancel your order within 24 hours of placing it. Go to 'My Orders', select the order, and click 'Cancel Order'."
    },
    {
        "text_input": "Do you offer refunds?",
        "output": "Yes, we offer full refunds within 30 days of purchase. Items must be unused and in original packaging. Refunds are processed within 5-10 business days."
    }
]
```

### Save as JSONL File
```python
with open('training_data.jsonl', 'w') as f:
    for example in training_data:
        f.write(json.dumps(example) + '\n')

print(f"Created training file with {len(training_data)} examples")
```

### Upload to Gemini API
```python
training_file = client.files.upload(path='training_data.jsonl')
print(f"Uploaded: {training_file.name}")
print(f"URI: {training_file.uri}")
```

**Tip:** Aim for 100–500+ high-quality, consistent examples for best results.

## Create Tuned Model

### Discover Tunable Models
```python
all_models = client.models.list()

tuning_models = [
    m for m in all_models 
    if 'createTunedModel' in m.supported_generation_methods
]

print("Models available for fine-tuning:")
for m in tuning_models:
    print(f"  - {m.name} ({m.display_name})")
```

Common options:
- `models/gemini-1.5-flash-001-tuning` → Fast, cost-effective
- `models/gemini-1.5-pro-001-tuning` → Higher capability and quality

### Start Tuning Job
```python
tuning_job = client.tuning.create_tuned_model(
    source_model="models/gemini-1.5-flash-001-tuning",
    training_data=training_file,
    config=types.CreateTunedModelConfig(
        display_name="customer-support-bot",
        description="Fine-tuned for consistent, friendly customer support responses",
        tuning_task=types.TuningTask(
            hyperparameters=types.Hyperparameters(
                epoch_count=5,
                batch_size=4,
                learning_rate=0.001
            )
        )
    )
)

print(f"Tuning job started: {tuning_job.name}")
```

### Monitor Progress
```python
tuned_model_name = tuning_job.name

while True:
    job = client.tuning.get_tuned_model(name=tuned_model_name)
    
    if job.state == types.TunedModelState.ACTIVE:
        print("Tuning completed successfully!")
        break
    elif job.state == types.TunedModelState.FAILED:
        print(f"Tuning failed: {job.error}")
        break
    else:
        print(f"Status: {job.state}... checking again in 60s")
        time.sleep(60)
```

### View Training Metrics
```python
tuned_model = client.tuning.get_tuned_model(name=tuned_model_name)

if tuned_model.tuning_task.snapshots:
    for s in tuned_model.tuning_task.snapshots:
        print(f"Epoch {s.epoch} | Step {s.step} | Loss: {s.mean_loss:.4f} | Time: {s.compute_time}")
        print("-" * 50)
```

## Use Tuned Model

### Single Generation
```python
response = client.models.generate_content(
    model=tuned_model_name,
    contents="What is your return policy?"
)
print(response.text)
```

### Compare Base vs Tuned Model
```python
base = client.models.generate_content(model="gemini-1.5-flash", contents="What is your return policy?")
tuned = client.models.generate_content(model=tuned_model_name, contents="What is your return policy?")

print("Base Model:\n", base.text)
print("\nTuned Model:\n", tuned.text)
```

### Chat with Tuned Model
```python
chat = client.chats.create(
    model=tuned_model_name,
    config=types.GenerateContentConfig(temperature=0.7, max_output_tokens=256)
)

print(chat.send_message("How do I track my order?").text)
print(chat.send_message("Can I change my shipping address?").text)
```

## Manage Tuned Models

### List All Tuned Models
```python
for model in client.tuning.list_tuned_models():
    print(f"{model.name} | {model.display_name} | State: {model.state} | Created: {model.create_time}")
    print("-" * 60)
```

### Get Details
```python
info = client.tuning.get_tuned_model(name=tuned_model_name)
print(f"Base: {info.base_model}")
print(f"Examples used: {info.tuning_task.training_data.examples.count}")
```

### Update Metadata
```python
client.tuning.update_tuned_model(
    name=tuned_model_name,
    updates=types.TunedModel(
        display_name="customer-support-bot-v2",
        description="Improved responses with more examples"
    )
)
```

### Delete Model
```python
client.tuning.delete_tuned_model(name=tuned_model_name)
print("Model deleted")
```

### Best Practices Summary

**Data**
- Use 100–500+ high-quality, consistent examples
- Ensure balanced coverage of query types
- Hold out validation data for testing

**Training**
- Start with 3–5 epochs
- Small batch sizes (2–8) often yield better results
- Monitor loss for signs of overfitting

**Cost & Efficiency**
- Prefer flash-tuning models for faster/cheaper runs
- Delete unused models to avoid storage costs
- Reuse successful hyperparameter settings
