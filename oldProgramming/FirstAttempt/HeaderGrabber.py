from bs4 import BeautifulSoup
import requests
import random


def findsubtitle(url):
    list = []
    page_to_scrape = requests.get(url)
    soup = BeautifulSoup(page_to_scrape.text, "html.parser")
    subtitles = soup.findAll("h3", attrs={"class":""})

    for subtitle in subtitles:
        # print(subtitle.text)
        list.append(subtitle.text)

    # print(list)
    fh = random.choice(list)
    return fh



# findsubtitle('https://www.ushistory.org/us/11.asp')