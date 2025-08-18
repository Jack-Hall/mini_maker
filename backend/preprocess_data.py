import numpy as np
import ipdb
import copy

chars = "abcdefghijklmnopqrstuvwxyz"

# turn into char list
chars = list(chars)

MAX_LENGTH = 5

class WordSet:
    def __init__(self, words):
        self.words = words
        self.top_level_sets = compute_all_sets(words)

        words_size = np.array([len(word) for word in words])
        self.words_of_length = {i: words[words_size == i] for i in range(1,MAX_LENGTH+1)}


    def word_lookup(self, pattern):
        """
        pattern is a string of alphaneumeric characters and underscores.
        the underscores represent a wildcard character.
        """
        length = len(pattern)
        assert length <= 5, "Pattern must be 5 characters long"
        # find all words that match the pattern
        num_wildcards = pattern.count("_")
        # print('length of pattern: ', length)
        
        matching_sets = []
        if num_wildcards == length:
            # print("returning all words")
            # print(self.words_of_length[length][0:10])
            return self.words_of_length[length]
        for i, char in enumerate(pattern):
            if pattern[i] != "_":
                matching_sets.append(self.top_level_sets[length][i][char])
        if len(matching_sets) == 0:
            return []
        # get the intersection to find all matching words
        matching_words = set.intersection(*matching_sets)
        return matching_words


class Grid:
    def __init__(self, grid=None, words=None):
        self.size = 5
        self.words = words
        # create char array of size 5x5
        # allowed characters are a-z, _, +
        if grid is None:
            self.grid = np.array([["_" for _ in range(5)] for _ in range(5)])
        else:
            self.grid = grid

        self.wordSet = WordSet(self.words)
        self.solutions = []
        # words are indices noting the start and end of the word in the grid.
        # words can be horizontal or vertical.

        # dummy init for now, just make every row and column a word.
        self.words = get_words_from_grid(self.grid)

    def find_grid_solutions(self):
        # find all solutions to the grid.
        # for each word, find all possible solutions.
        incomplete = False
        for word in self.words:
            if self.get_word_direction(word) == "vertical":
                continue
            # find all incomplete words in the grid.
            word_str = self.grid[
                word[0][0] : word[1][0] + 1, word[0][1] : word[1][1] + 1
            ]
            if self.get_word_direction(word) == "vertical":
                word_str = word_str.T
            word_str = "".join(word_str.flatten())

            if len(self.solutions) > 128:
                return
            if word_str.find("_") != -1:
                incomplete = True
                # print("size of word str", len(word_str))
                word_lookup = self.wordSet.word_lookup(word_str)
                # print("found ", len(word_lookup))
                if len(word_lookup) == 0:
                    return

                if not self.is_valid_puzzle(word, word_str):
                    # print("puzzle invalid continuing")
                    continue
                for new_word in word_lookup:
                    # print("length of candidate word: ", new_word, len(new_word))
                    if len(self.solutions) > 128:
                        return
                    if self.get_word_direction(word) == "vertical":
                        # For vertical words, reshape to column vector
                        word_array = np.array(list(new_word)).reshape(-1, 1)
                        self.grid[
                            word[0][0] : word[1][0] + 1, word[0][1] : word[1][1] + 1
                        ] = word_array.T
                    else:
                        # For horizontal words, reshape to row vector
                        word_array = np.array(list(new_word)).reshape(1, -1)

                        self.grid[
                            word[0][0] : word[1][0] + 1, word[0][1] : word[1][1] + 1
                        ] = word_array.T
                    # check if puzzle is valid:

                    # print("adding word", new_word, "solution length", len(self.solutions))
                    self.find_grid_solutions()
                    # Also fix the restoration of the original word
                    if self.get_word_direction(word) == "vertical":
                        word_array = np.array(list(word_str)).reshape(-1, 1)
                        self.grid[
                            word[0][0] : word[1][0] + 1, word[0][1] : word[1][1] + 1
                        ] = word_array.T
                    else:
                        word_array = np.array(list(word_str)).reshape(1, -1)
                        self.grid[
                            word[0][0] : word[1][0] + 1, word[0][1] : word[1][1] + 1
                        ] = word_array.T
                return
        if not incomplete and self.is_valid_puzzle(word, word_str):
            self.solutions.append(copy.deepcopy(self.grid))
            print(self.grid)
            print("solution length", len(self.solutions))
            # print(self.solutions)
            return

    def is_valid_puzzle(self, word, word_str):
        # for all words with a wildcard excluding the current word
        for words_to_check in self.words:
            if words_to_check == word:
                continue
            word_str_to_check = self.grid[
                words_to_check[0][0] : words_to_check[1][0] + 1,
                words_to_check[0][1] : words_to_check[1][1] + 1,
            ]
            if self.get_word_direction(words_to_check) == "vertical":
                word_str_to_check = word_str_to_check.T
            word_str_to_check = "".join(word_str_to_check.flatten())
            if len(self.wordSet.word_lookup(word_str_to_check)) == 0:
                return False

        return True

    def set_char(self, row, col, char):
        self.grid[row][col] = char

    def get_word_direction(self, word):
        # get the direction of the word.
        # if the first coordinate is less than the second, it is horizontal.
        # if the first coordinate is greater than the second, it is vertical.
        if word[0][0] < word[1][0]:
            return "horizontal"
        else:
            return "vertical"

    def get_word_length(self, word):
        # get the length of the word.
        return abs(word[0][0] - word[1][0]) + 1

    def get_char(self, row, col):
        return self.grid[row][col]


def preprocess_data(data):
    # load the txt file.
    with open(data, "r") as file:
        data = file.read()
    # get each word in the data.
    words = data.split()
    words = np.array(words)
    words = words
    words_size = np.array([len(word) for word in words])
    # find all words that are less than 6 characters.
    words = words[words_size <= 5]  # return the chunks
    words_size = np.array([len(word) for word in words])
    words = words[ words_size > 1]  # return the chunks
    # randomly shuffle the words array
    np.random.shuffle(words)
    return words


# def word_lookup(pattern):

def compute_all_sets(words):
    # top level sets for five letter words:
    top_level_sets = {length: [{char: set() for char in chars} for _ in range(length)] for length in range(2,6)}
    # fill in the top level sets
    for word in words:
        length = len(word)
        for i, char in enumerate(word):
            top_level_sets[length][i][char].add(word)

    return top_level_sets


def get_words_from_grid(grid):
    # given a grid of underscores and hashtags. find all words
    # a word is a row and column of uninterupted underscored. 
    # a word can contain no hastags or subwords.
    horizontal_words = get_horizontal_words(grid)
    vertical_words = get_horizontal_words(grid.T)
    vertical_words = [((word[0][1], word[0][0]),( word[1][1],word[1][0])) for word in vertical_words]
    return horizontal_words + vertical_words 


def get_horizontal_words(grid):
    # given a grid of underscores and hashtags. find all horizontal words
    # a word is a row of uninterupted underscored. 
    # a word can contain no hastags or subwords.
    words = []
    row_index = 0
    for row in grid:
        i = 0
        while i < len(row):
            char = row[i]
            while i < len(row) and char == "#":
                i +=1
                if i == len(row):
                    break
                char = row[i]
            word_start = i
            while i < len(row) and char != "#":
                char = row[i]
                i += 1
            #add the word.
            if(i <= len(row) and char == '#'):
                word_end = i-2
            else:
                word_end = i-1
            if word_end - word_start < 1:
                continue
            words.append(((row_index, word_start), (row_index, word_end)))
        row_index += 1
    return words
    

def test_get_words():
    words = [
    # rows
    ((0, 0), (0, 4)),
    ((1, 0), (1, 4)),
    ((2, 0), (2, 4)),
    ((3, 0), (3, 4)),
    ((4, 0), (4, 4)),
    # columns
    #
    ((0, 0), (4, 0)),
    ((0, 1), (4, 1)),
    ((0, 2), (4, 2)),
    ((0, 3), (4, 3)),
    ((0, 4), (4, 4)),
    ]
    grid = [
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
    ]
    grid = np.array(grid)
    print(grid)
    print(get_words_from_grid(grid))
    grid = [
        ["#", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "#"],
    ]
    grid = np.array(grid)
    print(grid)
    print(get_words_from_grid(grid))
    grid = [
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
        ["#", "#", "#", "#", "#"],
        ["_", "_", "_", "_", "_"],
        ["_", "_", "_", "_", "_"],
    ]
    grid = np.array(grid)
    print(grid)
    print(get_words_from_grid(grid))
    grid = [
        ["#", "_", "_", "_", "#"],
        ["_", "_", "_", "_", "#"],
        ["_", "_", "_", "_", "#"],
        ["_", "_", "_", "#", "#"],
        ["_", "_", "#", "#", "#"],
    ]
    grid = np.array(grid)
    print(grid)
    print(get_words_from_grid(grid))



def setup_test_grid(wordstr):
    grid = [
        ["#", "#", "c", "i", "g"],
        ["#", "g", "u", "r", "u"],
        ["c", "a", "n", "o", "n"],
        ["_", "_", "_", "n", "#"],
        ["_", "_", "_", "#", "#"],
    ]
    # words = ["___p_", "___e_", "horny", "___i_", "use"]
    # turn into 2d np char array
    # grid = np.array([[char for char in word] for word in words])
    return Grid(np.array(grid), wordstr)


if __name__ == "__main__":
    test_get_words()
    data = "backend/words_alpha.txt"
    words = preprocess_data(data)
    # save the words to a txt file.
    top_level_sets = compute_all_sets(words)
    word_set = WordSet(words)
    grid = setup_test_grid(words)
    # grid = Grid(words=words)
    grid.find_grid_solutions()
    # print(len(grid.solutions))
    # ipdb.set_trace()
    # with open("short_words.txt", "w") as file:
    #     for word in words:
    #         file.write(word + "\n")
