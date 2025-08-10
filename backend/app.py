 from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
from preprocess_data import Grid, WordSet, preprocess_data
import copy

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Load word data and create WordSet instance
words = preprocess_data("backend/words_alpha.txt")
word_set = WordSet(words)

@app.route('/api/play', methods=['POST'])
def play():
    grid = [
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
    ],
    return jsonify({'solutions': grid.solutions.tolist()})


@app.route('/api/find_grid_solutions', methods=['POST'])
def find_grid_solutions():
    try:
        data = request.get_json()
        
        # Validate input
        if 'grid' not in data:
            return jsonify({'error': 'Grid data is required'}), 400
        
        grid_data = data['grid']
        
        # Validate grid format
        if not isinstance(grid_data, list) or len(grid_data) == 0:
            return jsonify({'error': 'Grid must be a non-empty 2D array'}), 400
        
        # Convert grid to numpy array
        try:
            grid_array = np.array(grid_data, dtype=str)
        except Exception as e:
            return jsonify({'error': f'Invalid grid format: {str(e)}'}), 400
        
        # Validate grid content
        valid_chars = set('abcdefghijklmnopqrstuvwxyz_')
        for row in grid_array:
            for cell in row:
                if cell.lower() not in valid_chars:
                    return jsonify({'error': f'Invalid character in grid: {cell}. Only a-z, A-Z, and _ are allowed'}), 400
        
        # Convert to uppercase for consistency
        grid_array = np.char.upper(grid_array)
        
        # Create Grid instance
        grid = Grid(grid=grid_array, words=words)
        grid.wordSet = word_set
        
        # Find solutions
        grid.find_grid_solutions()
        
        # Convert solutions back to list format for JSON serialization
        solutions = []
        for solution in grid.solutions:
            # Convert numpy array to list of lists
            solution_list = solution.tolist()
            solutions.append(solution_list)
        
        return jsonify({
            'solutions': solutions,
            'solution_count': len(solutions)
        })
        
    except Exception as e:
        return jsonify({'error': f'Server error: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'message': 'Crossword API is running'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)