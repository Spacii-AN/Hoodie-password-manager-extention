from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import logging
from datetime import datetime, timedelta
import jwt

# Add the parent directory to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.core.user_manager import get_user_manager
from src.core.password_manager import (
    load_data,
    save_data,
    derive_key,
    encrypt_data,
    decrypt_data
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Secret key for JWT
SECRET_KEY = os.urandom(32)

# Session management
sessions = {}

def create_token(username):
    """Create a JWT token for the user"""
    return jwt.encode(
        {
            'username': username,
            'exp': datetime.utcnow() + timedelta(minutes=5)
        },
        SECRET_KEY,
        algorithm='HS256'
    )

def verify_token(token):
    """Verify a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        return payload['username']
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

@app.route('/api/login', methods=['POST'])
def login():
    """Handle user login"""
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({'error': 'Missing credentials'}), 400

    user_manager = get_user_manager()
    success, message = user_manager.authenticate_user(username, password)

    if success:
        token = create_token(username)
        sessions[username] = {
            'token': token,
            'expires': datetime.utcnow() + timedelta(minutes=5)
        }
        return jsonify({'token': token})
    else:
        return jsonify({'error': message}), 401

@app.route('/api/passwords', methods=['GET'])
def get_passwords():
    """Get all passwords for the authenticated user"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401

    token = auth_header.split(' ')[1]
    username = verify_token(token)
    if not username:
        return jsonify({'error': 'Invalid or expired token'}), 401

    user_manager = get_user_manager()
    db_path = user_manager.get_user_db_path(username)
    if not db_path:
        return jsonify({'error': 'User database not found'}), 404

    try:
        with open(db_path, 'rb') as f:
            encrypted_data = f.read()
        user_data = user_manager.user_registry["users"][username]
        salt = user_data["salt"]
        key = derive_key(password, salt)
        data = decrypt_data(encrypted_data, key)
        
        # Format passwords for the extension
        passwords = []
        for category, entries in data.items():
            for site, creds in entries.items():
                if isinstance(creds, dict) and 'username' in creds:
                    passwords.append({
                        'site': site,
                        'username': creds['username'],
                        'password': creds['password']
                    })
        
        return jsonify(passwords)
    except Exception as e:
        logger.error(f"Error retrieving passwords: {str(e)}")
        return jsonify({'error': 'Failed to retrieve passwords'}), 500

@app.route('/api/passwords', methods=['POST'])
def save_password():
    """Save a new password"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return jsonify({'error': 'Missing or invalid token'}), 401

    token = auth_header.split(' ')[1]
    username = verify_token(token)
    if not username:
        return jsonify({'error': 'Invalid or expired token'}), 401

    data = request.get_json()
    site = data.get('site')
    username = data.get('username')
    password = data.get('password')

    if not all([site, username, password]):
        return jsonify({'error': 'Missing required fields'}), 400

    try:
        user_manager = get_user_manager()
        db_path = user_manager.get_user_db_path(username)
        if not db_path:
            return jsonify({'error': 'User database not found'}), 404

        # Load existing data
        with open(db_path, 'rb') as f:
            encrypted_data = f.read()
        user_data = user_manager.user_registry["users"][username]
        salt = user_data["salt"]
        key = derive_key(password, salt)
        existing_data = decrypt_data(encrypted_data, key)

        # Add new password
        if 'Default' not in existing_data:
            existing_data['Default'] = {}
        existing_data['Default'][site] = {
            'username': username,
            'password': password
        }

        # Save updated data
        save_data(username, existing_data, key)
        return jsonify({'message': 'Password saved successfully'})
    except Exception as e:
        logger.error(f"Error saving password: {str(e)}")
        return jsonify({'error': 'Failed to save password'}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True) 