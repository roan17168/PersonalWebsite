import random
import ImageGUI

global style
global artist
global artType
style = ""
artist = ""
artType = 1

def compile(usable_subject):
    # style_list = ['surrealism', 'pop art', 'sci-fi', 'anime', 'watercolor', 'digital art', 'hyper-realistic']
    # style = random.choice(style_list)
    # artist_list = ['Leonardo da Vinci', 'Michelangelo', 'Rembrandt', 'Vermeer', 'Claude Monet']
    # artist = random.choice(artist_list)
    styleLines = open('Style.txt').read().splitlines()
    style = random.choice(styleLines)
    ImageGUI.style = style
    artistLines = open('Artist.txt').read().splitlines()
    artist = random.choice(artistLines)
    ImageGUI.artist = artist
    pick = random.randint(1, 2)
    ImageGUI.type = pick
    if pick == 1:
        image_name = (usable_subject + ' in the style of ' + style)
    elif pick == 2:
        image_name = (usable_subject + ' in the artist style of ' + artist)
    return image_name
