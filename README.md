# Memora - AI Journal Application

## Installation

1. Create a virtual environment:
```
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```
pip install -r requirements.txt
```

3. Set up Stripe:
   - Create a Stripe account if you don't have one
   - Get your API keys from the Stripe dashboard
   - Update the API keys in app.py

4. Initialize the database:
```
python app.py
```

5. Run the application:
```
flask run
```

## Features

- AI-powered journaling
- Mood tracking and analysis
- Stripe integration for premium subscriptions
- Secure user authentication
