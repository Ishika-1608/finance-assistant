from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
import pandas as pd
import jwt
from datetime import datetime, timedelta
from functools import wraps
import os
import tempfile

app = Flask(__name__)

# --- CONFIGURATION ---
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'super_secret_key_change_later'  # Use strong key in production
app.config['JWT_SECRET_KEY'] = 'jwt_secret_key_change_later'
app.config['JWT_EXPIRATION_HOURS'] = 24 * 7  # 7 days

# --- INITIALIZATION ---
CORS(app, supports_credentials=True, origins=['http://localhost:5173', 'http://127.0.0.1:5173'])
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)

# --- DATABASE MODELS ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    transactions = db.relationship('Transaction', backref='owner', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'username': self.username}

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(20), nullable=False)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# --- JWT TOKEN HELPERS ---
def create_jwt_token(user_id):
    """Create a JWT token for the user"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=app.config['JWT_EXPIRATION_HOURS']),
        'iat': datetime.utcnow()
    }
    token = jwt.encode(payload, app.config['JWT_SECRET_KEY'], algorithm='HS256')
    return token

def verify_jwt_token(token):
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    """Decorator for protecting routes with JWT"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = None
        
        # Get token from Authorization header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({"error": "Invalid authorization header"}), 401
        
        if not token:
            return jsonify({"error": "Token is missing"}), 401
        
        payload = verify_jwt_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        
        # Get user from token
        user = User.query.get(payload['user_id'])
        if not user:
            return jsonify({"error": "User not found"}), 401
        
        # Pass user to the route
        request.user = user
        return f(*args, **kwargs)
    
    return decorated_function

# --- LOGIC FUNCTIONS ---
def categorize_transaction(description):
    description = description.lower()
    if 'salary' in description or 'deposit' in description: return 'Income'
    elif 'rent' in description: return 'Rent'
    elif 'grocery' in description or 'market' in description: return 'Groceries'
    elif 'netflix' in description or 'movie' in description: return 'Entertainment'
    elif 'uber' in description or 'gas' in description: return 'Transport'
    elif 'coffee' in description or 'restaurant' in description: return 'Dining Out'
    elif 'gym' in description: return 'Health'
    elif 'amazon' in description or 'shopping' in description: return 'Shopping'
    elif 'electric' in description or 'internet' in description: return 'Utilities'
    else: return 'Other'

def analyze_finances(df):
    df = df.sort_values('date')
    df['running_balance'] = df['amount'].cumsum()

    expenses = df[df['amount'] < 0].copy()
    expenses['spent'] = expenses['amount'].abs()
    category_spending = expenses.groupby('category')['spent'].sum().to_dict()

    total_income = df[df['amount'] > 0]['amount'].sum()
    total_expense = expenses['spent'].sum()
    
    burn_rate_ratio = total_expense / total_income if total_income > 0 else 0
    
    if burn_rate_ratio > 0.9: risk_status, risk_color = "High Risk", "red"
    elif burn_rate_ratio > 0.7: risk_status, risk_color = "Caution", "yellow"
    else: risk_status, risk_color = "Healthy", "green"

    recommendations = []
    if burn_rate_ratio > 0.8: recommendations.append({"icon": "alert", "text": "High Spending Alert", "detail": f"You are spending {int(burn_rate_ratio*100)}% of your income."})
    if category_spending.get('Dining Out', 0) > 100: recommendations.append({"icon": "utensils", "text": "Optimize Dining Costs", "detail": f"You spent ${category_spending.get('Dining Out', 0):.2f} on dining out."})
    if category_spending.get('Shopping', 0) > 150: recommendations.append({"icon": "shopping-bag", "text": "Review Shopping Habits", "detail": "Consider postponing non-essential shopping items."})
    if burn_rate_ratio < 0.7: recommendations.append({"icon": "savings", "text": "Great Job!", "detail": "You have a healthy savings rate."})

    timeline_data = df[['date', 'running_balance']].copy()
    timeline_data['date'] = timeline_data['date'].dt.strftime('%Y-%m-%d')
    
    return {
        "summary": {"total_income": round(total_income, 2), "total_expense": round(total_expense, 2), "net_savings": round(total_income - total_expense, 2), "risk_status": risk_status, "risk_color": risk_color},
        "spending_by_category": category_spending,
        "balance_timeline": timeline_data.to_dict(orient='records'),
        "recommendations": recommendations
    }

# --- ROUTES ---

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400
    
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(username=username, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"message": "User registered successfully"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
    
    user = User.query.filter_by(username=username).first()
    
    if user and bcrypt.check_password_hash(user.password, password):
        token = create_jwt_token(user.id)
        print(f"[INFO] User logged in: {username}, Token: {token[:20]}...")
        return jsonify({
            "message": "Login successful",
            "token": token,
            "user": user.to_dict()
        }), 200
    
    return jsonify({"error": "Invalid credentials"}), 401

@app.route('/api/logout', methods=['POST'])
@token_required
def logout():
    # With JWT tokens, logout is typically handled client-side by removing the token
    return jsonify({"message": "Logged out"}), 200

@app.route('/api/check_session', methods=['GET'])
def check_session():
    token = None
    
    # Get token from Authorization header
    if 'Authorization' in request.headers:
        auth_header = request.headers['Authorization']
        try:
            token = auth_header.split(" ")[1]
        except IndexError:
            return jsonify({"logged_in": False}), 200
    
    if not token:
        return jsonify({"logged_in": False}), 200
    
    payload = verify_jwt_token(token)
    if not payload:
        return jsonify({"logged_in": False}), 200
    
    user = User.query.get(payload['user_id'])
    if user:
        return jsonify({"logged_in": True, "username": user.username}), 200
    
    return jsonify({"logged_in": False}), 200

@app.route('/api/insights', methods=['GET'])
@token_required
def get_insights():
    user = request.user
    user_transactions = Transaction.query.filter_by(user_id=user.id).all()
    
    if not user_transactions:
        return jsonify({"error": "No transactions found. Add some data first!"}), 404

    data_list = [{
        "date": t.date,
        "description": t.description,
        "amount": t.amount,
        "category": t.category
    } for t in user_transactions]
    
    df = pd.DataFrame(data_list)
    df['date'] = pd.to_datetime(df['date'])

    insights = analyze_finances(df)
    return jsonify(insights), 200

@app.route('/api/transactions', methods=['GET'])
@token_required
def get_transactions():
    user = request.user
    user_transactions = Transaction.query.filter_by(user_id=user.id).all()
    transactions = [{
        "id": t.id,
        "date": t.date,
        "description": t.description,
        "amount": t.amount,
        "category": t.category
    } for t in user_transactions]
    return jsonify(transactions), 200

@app.route('/api/transactions', methods=['POST'])
@token_required
def add_transaction():
    user = request.user
    data = request.get_json()
    
    print(f"[INFO] Adding transaction for user: {user.username}")
    print(f"[INFO] Data: {data}")
    
    if not data.get('date') or not data.get('description') or not data.get('amount'):
        return jsonify({"error": "date, description, and amount are required"}), 400
    
    # Auto-categorize if category not provided
    category = data.get('category')
    if not category:
        category = categorize_transaction(data.get('description'))

    new_transaction = Transaction(
        date=data.get('date'),
        description=data.get('description'),
        amount=float(data.get('amount')),
        category=category,
        user_id=user.id
    )
    db.session.add(new_transaction)
    db.session.commit()
    
    print(f"[INFO] Transaction added successfully! ID: {new_transaction.id}")
    return jsonify({"message": "Transaction added", "id": new_transaction.id}), 201

@app.route('/api/transactions/<int:id>', methods=['DELETE'])
@token_required
def delete_transaction(id):
    user = request.user
    transaction = Transaction.query.filter_by(id=id, user_id=user.id).first()
    if not transaction:
        return jsonify({"error": "Transaction not found"}), 404
    
    db.session.delete(transaction)
    db.session.commit()
    print(f"[INFO] Deleted transaction {id} for user {user.username}")
    return jsonify({"message": "Transaction deleted"}), 200

@app.route('/api/upload-csv', methods=['POST'])
@token_required
def upload_csv():
    user = request.user
    
    if 'csv' not in request.files:
        return jsonify({"error": "No CSV file provided"}), 400
    
    csv_file = request.files['csv']
    if csv_file.filename == '':
        return jsonify({"error": "No CSV file selected"}), 400
    
    temp_path = None
    try:
        # Save uploaded file to temp
        temp_path = tempfile.mktemp(suffix='.csv')
        csv_file.save(temp_path)
        
        # Process CSV
        transactions = process_csv_file(temp_path)
        
        # Bulk insert
        added_count = 0
        for t_data in transactions:
            new_transaction = Transaction(
                date=t_data['date'],
                description=t_data['description'],
                amount=float(t_data['amount']),
                category=t_data['category'],
                user_id=user.id
            )
            db.session.add(new_transaction)
            added_count += 1
        
        db.session.commit()
        print(f"[INFO] Added {added_count} transactions from CSV for user {user.username}")
        return jsonify({"message": f"Successfully added {added_count} transactions from CSV"}), 201
        
    except Exception as e:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)
        return jsonify({"error": str(e)}), 400
    finally:
        if temp_path and os.path.exists(temp_path):
            os.unlink(temp_path)

def process_csv_file(csv_path):
    """Process CSV file and return list of transaction dicts ready for DB insert"""
    df = pd.read_csv(csv_path)
    required_cols = ['date', 'description', 'amount']
    if not all(col in df.columns for col in required_cols):
        raise ValueError(f"CSV must have columns: {', '.join(required_cols)}")
    
    df['amount'] = pd.to_numeric(df['amount'], errors='coerce')
    df['date'] = pd.to_datetime(df['date'], errors='coerce').dt.strftime('%Y-%m-%d')
    df = df.dropna(subset=['date', 'description', 'amount'])
    
    # Auto categorize
    df['category'] = df['description'].apply(categorize_transaction)
    
    return df[required_cols + ['category']].to_dict('records')

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)