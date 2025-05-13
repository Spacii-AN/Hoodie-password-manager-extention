# Hoodie Password Manager Extension

A secure and user-friendly browser extension for managing your passwords with a modern UI and robust security features.

## Features

- 🔒 Secure password storage and management
- 🎨 Modern and intuitive user interface
- 🔄 Easy password generation and auto-fill
- 🔐 Local encryption for enhanced security
- 🌐 Cross-browser compatibility
- ⚡ Fast and responsive performance

## Installation

1. Clone this repository:
```bash
git clone https://github.com/Spacii-AN/Hoodie-password-manager-extention.git
```

2. Install the required Python dependencies:
```bash
pip install -r requirements.txt
```

3. Load the extension in your browser:
   - Open Chrome/Edge and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension directory

## Usage

1. Start the API server:
```bash
python api_server.py
```

2. Click the extension icon in your browser toolbar to open the password manager
3. Create a master password to secure your vault
4. Start adding and managing your passwords

## Security Features

- Local encryption of stored passwords
- Secure password generation
- Master password protection
- No cloud storage - all data stays on your device

## Development

The extension consists of several components:
- `popup.html` & `popup.js`: The main user interface
- `background.js`: Background processes and event handling
- `content.js`: Content script for webpage interaction
- `api_server.py`: Local server for password management
- `manifest.json`: Extension configuration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have questions, please open an issue in the GitHub repository. 