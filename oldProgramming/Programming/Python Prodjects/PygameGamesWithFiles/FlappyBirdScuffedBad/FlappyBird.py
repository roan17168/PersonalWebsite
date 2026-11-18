# VERY INCOMPLETE AND TRASH SPENT TO LONG ON THIS DONE ALL BY MY SELF
# Need to work on restarting with a and having different tubes come

import subprocess
import sys
import pygame
import random
import math
import time
import os
from pygame import mixer

times_through_loop = 151
times_through_loop_2 = 400
score = 0
pipe = 0
game = "not over"
again = False

# Initialize pygame
pygame.init()

# Create the screen
screen = pygame.display.set_mode((800, 600))

# Background
background = pygame.image.load("FlappyBirdBackground(1).jpg")

# Title and Icon
pygame.display.set_caption("Roan's Bad Flappy Bird!")
icon = pygame.image.load("Bird.png")
pygame.display.set_icon(icon)

# Player
player_img_up = pygame.image.load("BirdUp.png")
player_img = pygame.image.load("Bird.png")
player_x = 370
player_y = 300
player_y_change = 0.35

# Game Over Text
over_font = pygame.font.Font("freesansbold.ttf", 64)
score_font = pygame.font.Font("freesansbold.ttf", 40)
a_q_font = pygame.font.Font("freesansbold.ttf", 20)

# Pipe Middle
pipe_middle_top_img = pygame.image.load("TopMiddlePipe.png")
pipe_middle_top_x = 800
pipe_middle_top_y = -40
pipe_middle_top_x_change = -0.35
pipe_middle_top_y_change = 0
num_of_pipes_top = 8

pipe_middle_bottem_img = pygame.image.load("BottemMiddlePipe.png")
pipe_middle_bottem_x = 800
pipe_middle_bottem_y = 400
pipe_middle_bottem_x_change = -0.35
pipe_middle_bottem_y_change = 0
num_of_pipes_bottem = 8


def pipe_middle_bottem(x, y, ):
    screen.blit(pipe_middle_bottem_img, (x, y))


def pipe_middle_top(x, y, ):
    screen.blit(pipe_middle_top_img, (x, y))


def player_up(x, y):
    screen.blit(player_img_up, (x, y))


def player(x, y):
    screen.blit(player_img, (x, y))


def game_over_text_sound():
    time.sleep(0.5)
    global pipe_middle_bottem_x
    global pipe_middle_top_x
    pipe_middle_top_x = 2000000
    pipe_middle_bottem_x = 2000000
    over_text = over_font.render("GAME OVER", True, (255, 0, 0))
    score_text = over_font.render("Score: " + str(score), True, (255, 0, 0))
    screen.blit(over_text, (200, 200))
    screen.blit(score_text, (280, 300))
    game_over_sound = mixer.Sound("GameOver.wav")
    game_over_sound.play()
    global times_through_loop
    times_through_loop = 200000000
    times_through_loop += 1
    play_again = a_q_font.render("PRESS A TO PLAY AGAIN", True, (255, 0, 0))
    quit_q = a_q_font.render("PRESS Q TO QUIT", True, (255, 0, 0))
    screen.blit(play_again, (10, 500))
    screen.blit(quit_q, (600, 500))
    pygame.display.update()


def is_collision_middle_top(player_rect, pipe_middle_top_rect):
    if player_rect.colliderect(pipe_middle_top_rect):
        global game
        global player_y
        game = "over"
        player_y = 20000
        screen.fill((0, 0, 0))
        game_over_text_sound()
        pygame.display.update()


def is_collision_middle_bottem(player_rect, pipe_middle_bottem_rect):
    if player_rect.colliderect(pipe_middle_bottem_rect):
        global game
        global player_y
        game = "over"
        player_y = 20000
        screen.fill((0, 0, 0))
        game_over_text_sound()
        pygame.display.update()


def main():
    global running
    global again
    global game
    global times_through_loop
    global times_through_loop_2
    global score
    global player_y
    global player_y_change
    global pipe
    global pipe_middle_top_x_change
    global pipe_middle_bottem_x_change
    global pipe_middle_top_x
    global pipe_middle_bottem_x
    global player_y

    game = "not over"
    running = True
    while running:
        times_through_loop_2 += 1
        times_through_loop += 1
        # RGB coloring the background
        screen.fill((0, 255, 255))
        # Background Image
        score_text = score_font.render("Score: " + str(score), True, (255, 255, 255))
        screen.blit(background, (0, 0))
        screen.blit(score_text, (10, 10))
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False

            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    times_through_loop = 0
                    player_y += -125
                    player_up(player_x, player_y)
                if event.key == pygame.K_a:
                    subprocess.call([sys.executable, os.path.realpath(__file__)] + sys.argv[1:])
                if event.key == pygame.K_q:
                    running = False
            if event.type == pygame.KEYUP:
                if event.key == pygame.K_SPACE:
                    player_y_change = 0.35

        if player_y <= 0:
            player_y = 0
        elif player_y >= 550:
            game = "over"
            player_y = 20000
            screen.fill((0, 0, 0))
            game_over_text_sound()
            pygame.display.update()

        if times_through_loop > 150:
            player(player_x, player_y)
        else:
            player_up(player_x, player_y)

        # Pipes
        if times_through_loop_2 >= 400:
            pipe_number = random.randint(1, 1)
            if pipe_number == 1:
                pipe_middle_top(pipe_middle_top_x, pipe_middle_top_y)
                pipe_middle_bottem(pipe_middle_bottem_x, pipe_middle_bottem_y)
            if pipe_number == 2:
                pass
            if pipe_number == 3:
                pass

        if pipe_middle_top_x and 340 < pipe_middle_bottem_x < 340.25:
            score += 1

        if pipe_middle_top_x < 0 and game == "not over":
            pipe_middle_top_x = 800
        if pipe_middle_bottem_x < 0 and game == "not over":
            pipe_middle_bottem_x = 800

        # Collision

        player_rect = pygame.Rect(player_x, player_y, 64, 43)
        pipe_middle_top_rect = pygame.Rect(pipe_middle_top_x, pipe_middle_top_y, 100, 250)
        pipe_middle_bottem_rect = pygame.Rect(pipe_middle_bottem_x, pipe_middle_bottem_y, 100, 250)

        is_collision_middle_top(player_rect, pipe_middle_top_rect)
        is_collision_middle_bottem(player_rect, pipe_middle_bottem_rect)

        player_y += player_y_change
        pipe_middle_bottem_x += pipe_middle_bottem_x_change
        pipe_middle_top_x += pipe_middle_top_x_change
        pipe_middle_top(pipe_middle_top_x, pipe_middle_top_y)
        pipe_middle_bottem(pipe_middle_bottem_x, pipe_middle_bottem_y)
        pygame.display.update()


main()
