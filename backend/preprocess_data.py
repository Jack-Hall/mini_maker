import numpy as np
import ipdb
chars = "abcdefghijklmnopqrstuvwxyz"

#turn into char list
chars = list(chars)

class WordSet:
    def __init__(self, words):
        self.words = words
        self.top_level_sets = compute_all_sets(words)
    
    def word_lookup(self, pattern):
        """
        pattern is a string of alphaneumeric characters and underscores.
        the underscores represent a wildcard character.
        """
        length = len(pattern)
        assert length <= 5, "Pattern must be 5 characters long"
        #find all words that match the pattern
        num_wildcards = pattern.count("_")
        matching_sets = []

        for i, char in enumerate(pattern):
            if pattern[i] != "_":
                matching_sets.append(self.top_level_sets[i][char])

        #get the intersection to find all matching words
        matching_words = set.intersection(*matching_sets)
        return matching_words

def preprocess_data(data):
    #load the txt file. 
    with open(data, 'r') as file:
        data = file.read()
    #get each word in the data.
    words = data.split()
    words = np.array(words)
    words = words
    words_size = np.array([len(word) for word in words])
    #find all words that are less than 6 characters.
    words = words[words_size == 5]    #return the chunks
    print(len(words))
    return words


# def word_lookup(pattern):

def compute_all_sets(words):
    #top level sets for five letter words:
    top_level_sets = [{char: set() for char in chars} for _ in range(5)]
    #fill in the top level sets
    for word in words:
        for i, char in enumerate(word):
            top_level_sets[i][char].add(word)

    return top_level_sets

if __name__ == "__main__":
    data = "backend/words_alpha.txt"
    words = preprocess_data(data)
    #save the words to a txt file.
    top_level_sets = compute_all_sets(words)
    word_set = WordSet(words)
    ipdb.set_trace()
    with open("short_words.txt", "w") as file:
        for word in words:
            file.write(word + "\n")


    