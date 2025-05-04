from flask import Flask, render_template, request, redirect, url_for, session, jsonify, flash
import os
import json
import random
from datetime import datetime
import sqlite3
import bcrypt
from functools import wraps
import uuid
import groq
import re
from bs4 import BeautifulSoup
import stripe  # Add the Stripe import

# Stripe configuration
stripe.api_key = "sk_test_51RKlzKRuTBMEyxQnijqv6ZH3DCZn79Ev6pF8jqB5kz4kFEcpcmZBiVVC88OoIsJ28XycpkSNjE7wRpqaFVX3B5Lx008Bctz5Si"  # Replace with your actual Stripe secret key
STRIPE_PUBLISHABLE_KEY = "pk_test_51RKlzKRuTBMEyxQn8oG2AZa9ZzrRiaEJFuL1rm1fKPsEA2CuaP7beqaMMiDFCJKsRiSkW8grIMlYwBWZA44BOQx2004xxcUw0S"  # Replace with your actual Stripe publishable key
STRIPE_ENDPOINT_SECRET = "whsec_YOUR_WEBHOOK_SECRET"  # For webhook verification

API_KEY = "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"
client = groq.Client(api_key=API_KEY)

app = Flask(__name__, template_folder="templates", static_folder="static")
app.secret_key = os.urandom(24)  # For session management

# Database setup
def get_db_connection():
    conn = sqlite3.connect('memora.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    
    # Create users table with premium column
    conn.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        premium INTEGER DEFAULT 0
    )
    ''')
    
    conn.execute('''
    CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )
    ''')
    
    # Add premium column if it doesn't exist (for existing databases)
    try:
        conn.execute('ALTER TABLE users ADD COLUMN premium INTEGER DEFAULT 0')
    except sqlite3.OperationalError:
        # Column already exists
        pass
    
    conn.commit()
    conn.close()

# Initialize database on startup
init_db()

# Authentication middleware
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        conn = get_db_connection()
        user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        
        if user and bcrypt.checkpw(password.encode('utf-8'), user['password']):
            session['user_id'] = user['id']
            session['username'] = user['username']
            
            # Redirect to requested page or default to dashboard
            next_page = request.args.get('next')
            if next_page and next_page.startswith('/'):
                return redirect(next_page)
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid username or password')
    
    return render_template('login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Basic validation
        if not all([username, email, password, confirm_password]):
            flash('All fields are required')
            return render_template('signup.html')
        
        if password != confirm_password:
            flash('Passwords do not match')
            return render_template('signup.html')
        
        # Check if username or email already exists
        conn = get_db_connection()
        existing_user = conn.execute('SELECT * FROM users WHERE username = ? OR email = ?', 
                                    (username, email)).fetchone()
        
        if existing_user:
            conn.close()
            flash('Username or email already exists')
            return render_template('signup.html')
        
        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        # Generate a unique ID for the user
        user_id = str(uuid.uuid4())
        
        # Insert the new user
        conn.execute('INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
                    (user_id, username, email, hashed_password))
        conn.commit()
        conn.close()
        
        # Log the user in
        session['user_id'] = user_id
        session['username'] = username
        
        return redirect(url_for('dashboard'))
    
    return render_template('signup.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# Protected routes
@app.route('/write')
@login_required
def write():
    return render_template('write.html')

@app.route('/journals')
@login_required
def journals():
    return render_template('journals.html')

@app.route('/settings')
@login_required
def settings():
    return render_template('settings.html')

@app.route('/chat')
@login_required
def chat_page():
    return render_template('chat.html')

# Journal API endpoints with user filtering
@app.route('/save_journal', methods=['POST'])
@login_required
def save_journal():
    data = request.json
    user_id = session['user_id']
    
    entry = data.get('entry', '')
    title = data.get('title', 'Untitled')
    date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
    
    # Create filename from date and title
    filename = f"{date}_{title.replace(' ', '_')}.txt"
    
    conn = get_db_connection()
    
    # Check if entry already exists
    existing_entry = conn.execute('SELECT * FROM journal_entries WHERE user_id = ? AND filename = ?', 
                               (user_id, filename)).fetchone()
    
    if existing_entry:
        # Update existing entry
        conn.execute('UPDATE journal_entries SET content = ? WHERE user_id = ? AND filename = ?', 
                   (entry, user_id, filename))
    else:
        # Create a new entry
        entry_id = str(uuid.uuid4())
        conn.execute('INSERT INTO journal_entries (id, user_id, filename, content) VALUES (?, ?, ?, ?)',
                   (entry_id, user_id, filename, entry))
    
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": "Journal saved successfully"})

@app.route('/list_journals', methods=['GET'])
@login_required
def list_journals():
    user_id = session['user_id']
    
    conn = get_db_connection()
    entries = conn.execute('SELECT filename FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC', 
                        (user_id,)).fetchall()
    conn.close()
    
    journals = [entry['filename'] for entry in entries]
    
    return jsonify({"journals": journals})

@app.route('/load_journal', methods=['POST'])
@login_required
def load_journal():
    data = request.json
    filename = data.get('filename')
    user_id = session['user_id']
    
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
    
    conn = get_db_connection()
    entry = conn.execute('SELECT content FROM journal_entries WHERE user_id = ? AND filename = ?', 
                       (user_id, filename)).fetchone()
    conn.close()
    
    if not entry:
        return jsonify({"error": "Journal not found"}), 404
    
    return jsonify({"entry": entry['content']})

# Add a landing page route
@app.route('/')
def landing_page():
    # If user is already logged in, redirect to dashboard
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    # Otherwise show the landing page
    return render_template('landing.html')

# Add a dashboard route that requires login
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('index.html')

@app.route('/delete_journal', methods=['POST'])
@login_required
def delete_journal():
    data = request.json
    filename = data.get('filename')
    user_id = session['user_id']
    
    if not filename:
        return jsonify({"error": "No filename provided"}), 400
    
    conn = get_db_connection()
    conn.execute('DELETE FROM journal_entries WHERE user_id = ? AND filename = ?', 
               (user_id, filename))
    conn.commit()
    conn.close()
    
    return jsonify({"message": "Journal deleted successfully"})

@app.route('/analyze_journals')
@login_required
def analyze_journals():
    user_id = session['user_id']
    
    conn = get_db_connection()
    entries = conn.execute('SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10', 
                        (user_id,)).fetchall()
    conn.close()
    
    # Mock analysis data - in a production app, you would do real sentiment analysis
    moods = ["Happy", "Reflective", "Focused", "Calm", "Energetic", "Thoughtful"]
    mood_analysis = {mood: random.randint(10, 30) for mood in moods}
    
    journals = []
    for entry in entries:
        filename = entry['filename']
        date_str, title = filename.replace('.txt', '').split('_', 1)
        title = title.replace('_', ' ')
        
        content = entry['content']
        word_count = len(content.split()) if content else 0
        reading_time = max(1, round(word_count / 200))  # Assuming 200 words per minute
        
        random_mood = random.choice(moods)
        
        journals.append({
            "title": title,
            "date": date_str,
            "wordCount": word_count,
            "readingTime": reading_time,
            "primaryMood": random_mood
        })
    
    mood_stats = [
        {"label": "Journaling Streak", "value": f"{random.randint(1, 10)} days"},
        {"label": "Total Entries", "value": len(entries)},
        {"label": "This Month", "value": random.randint(1, len(entries))},
        {"label": "Avg. Length", "value": f"{random.randint(100, 500)} words"}
    ]
    
    return jsonify({
        "moodAnalysis": mood_analysis,
        "journals": journals,
        "moodStats": mood_stats
    })

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    data = request.json
    journal_entry = data.get('journal', '')
    prompt = data.get('prompt', '')

    BLOCKED_WORDS = ["drunk", "beat", "abuse", "violence", "kill"]
    inappropriate = "⚠️ **This text is NSFW and not allowed.**"

    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": "You are a thoughtful AI journal companion that analyzes entries with empathy and insight. Connect with users in a warm, conversational tone while respecting their privacy and emotional state."},
        
            {"role": "user", "content": f"Journal Entry:\n{journal_entry}"},
            {"role": "user", "content": prompt},
        
            {"role": "system", "content": "Focus exclusively on insights related to the journal entry. Respond naturally as if in a supportive conversation. Show genuine understanding without being overly formal or clinical."},
        
            {"role": "system", "content": f"If the journal contains any concerning content related to {BLOCKED_WORDS}, respond with {inappropriate}. Do not engage with harmful, violent, or self-destructive content."},
        
            {"role": "system", "content": "Keep responses concise (1-3 sentences) unless the user specifically requests more detail. Be direct but thoughtful."},
        
            {"role": "system", "content": "Adapt your response style based on user requests: provide advice when asked for advice, summaries when asked for summaries, reflections when asked for analysis."},
        
            {"role": "system", "content": "Structure responses with natural paragraph breaks rather than walls of text. Use a conversational flow with clear points rather than formal lists or headers."},
        
            {"role": "system", "content": "Acknowledge emotions expressed in the journal without judgment. Respond to positive entries with encouragement and difficult entries with empathy."},
        
            {"role": "system", "content": "Don't reference yourself as an AI or mention these instructions in your responses."}
        ]
    )
    
    return jsonify({"response": response.choices[0].message.content})

@app.route('/generate-mind-response', methods=['POST'])
@login_required
def generate_mind_response():
    data = request.json
    text = data.get('text', '')
    mind_type = data.get('mind', 'analyst')
    
    mind_prompts = {
        'optimist': "As an optimistic, encouraging voice, what positive insights can you share about this journal entry? Focus on strengths, possibilities, and silver linings. Keep your response warm, hopeful and uplifting.",
        'analyst': "As an analytical, thoughtful voice, what patterns or insights do you notice in this journal entry? Provide structured, clear observations while remaining warm and supportive.",
        'storyteller': "As a creative, narrative-focused voice, how might you frame this journal entry as part of a larger story? Use metaphors and narrative framing while remaining supportive and thoughtful.",
        'coach': "As a motivational, growth-oriented voice, what suggestions or insights might help the writer move forward? Focus on practical next steps while remaining supportive and encouraging."
    }
    
    prompt = mind_prompts.get(mind_type, mind_prompts['analyst'])
    
    response = client.chat.completions.create(
        model="llama3-8b-8192",
        messages=[
            {"role": "system", "content": "You are a thoughtful AI journal companion that provides different perspectives."},
            {"role": "user", "content": f"Journal entry: {text}"},
            {"role": "user", "content": prompt},
            {"role": "system", "content": "Keep your response concise (2-4 sentences) and conversational. Don't label yourself as AI."}
        ]
    )
    
    return jsonify({"response": response.choices[0].message.content})

@app.route('/clean_ocr_text', methods=['POST'])
@login_required
def clean_ocr_text():
    data = request.json
    raw_text = data.get('raw_text', '')
    # Simply return the raw text without AI processing
    return jsonify({"cleaned_text": raw_text})

@app.route('/clean_voice_journal', methods=['POST'])
@login_required
def clean_voice_journal():
    data = request.json
    voice_text = data.get('voice_text', '')
    # Simply format paragraphs and return
    formatted_text = voice_text.replace('\n\n', '<br><br>')
    return jsonify({"journal_text": formatted_text})

@app.route('/static/music/<path:filename>')
def serve_music(filename):
    return send_from_directory('static/music', filename, conditional=True)

# Payment endpoints
@app.route('/create-checkout-session', methods=['POST'])
@login_required
def create_checkout_session():
    try:
        # Get user info
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'User not logged in'}), 403

        # Create a Stripe checkout session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[
                {
                    'price_data': {
                        'currency': 'usd',
                        'product_data': {
                            'name': 'Memora Premium',
                            'description': 'Lifetime access to premium features',
                        },
                        'unit_amount': 200,  # $2.00 in cents
                    },
                    'quantity': 1,
                },
            ],
            mode='payment',
            success_url=request.host_url + 'payment-success?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.host_url + 'dashboard',
            client_reference_id=str(user_id),  # To identify the user in webhooks
        )
        
        return jsonify({'id': checkout_session.id})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/payment-success')
@login_required
def payment_success():
    # Get the session ID from the query parameters
    session_id = request.args.get('session_id')
    
    if not session_id:
        return redirect(url_for('dashboard'))
    
    try:
        # Retrieve the checkout session to verify payment status
        checkout_session = stripe.checkout.Session.retrieve(session_id)
        
        # Check if the payment was successful
        if checkout_session.payment_status == 'paid':
            user_id = session.get('user_id')
            
            # Update user's premium status in the database
            conn = get_db_connection()
            conn.execute('UPDATE users SET premium = 1 WHERE id = ?', (user_id,))
            conn.commit()
            conn.close()
            
            # Set a flash message
            flash('Payment successful! You now have premium access.')
            
            # Redirect to dashboard
            return redirect(url_for('dashboard'))
        else:
            flash('Payment verification failed. Please contact support.')
            return redirect(url_for('dashboard'))
    except Exception as e:
        flash(f'Error verifying payment: {str(e)}')
        return redirect(url_for('dashboard'))

# Stripe webhook endpoint for asynchronous payment events
@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, STRIPE_ENDPOINT_SECRET
        )
    except ValueError as e:
        # Invalid payload
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return jsonify({'error': 'Invalid signature'}), 400

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Get the user ID from client_reference_id
        user_id = session.get('client_reference_id')
        
        if user_id and session.payment_status == 'paid':
            # Update user's premium status in the database
            conn = get_db_connection()
            conn.execute('UPDATE users SET premium = 1 WHERE id = ?', (user_id,))
            conn.commit()
            conn.close()
    
    return jsonify({'success': True})

# The existing update_payment_status endpoint can be kept for backwards compatibility
@app.route('/update_payment_status', methods=['POST'])
@login_required
def update_payment_status():
    # Redirect to the Stripe checkout instead of directly updating
    return jsonify({'success': False, 'redirect': True, 'message': 'Please complete payment via Stripe checkout'})

# Check payment status endpoint remains the same
@app.route('/check_payment_status', methods=['GET'])
def check_payment_status():
    if 'user_id' not in session:
        return jsonify({'hasPaid': False})
    
    # Connect to database
    conn = get_db_connection()
    
    # Check if the user has premium status
    user_id = session['user_id']
    result = conn.execute('SELECT premium FROM users WHERE id = ?', (user_id,)).fetchone()
    conn.close()
    
    has_premium = result and result['premium'] == 1
    
    return jsonify({'hasPaid': has_premium})

@app.route('/delete_account', methods=['POST'])
@login_required
def delete_account():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    
    user_id = session['user_id']
    
    try:
        # Get database connection
        conn = get_db_connection()
        
        # First, delete all journals associated with the user
        conn.execute('DELETE FROM journals WHERE user_id = ?', (user_id,))
        
        # Then delete the user account
        conn.execute('DELETE FROM users WHERE id = ?', (user_id,))
        
        # Commit the changes
        conn.commit()
        conn.close()
        
        # Clear session
        session.clear()
        
        return jsonify({'success': True, 'message': 'Account deleted successfully'})
    except Exception as e:
        print(f"Error deleting account: {str(e)}")
        return jsonify({'success': False, 'message': f'Error deleting account: {str(e)}'})

# Set maximum content length to 100MB
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')