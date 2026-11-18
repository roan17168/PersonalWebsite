import ImageGenerator
import HeaderGrabber
import ImageGUI
import PromptCompiler
import UrlGrabberGUI
import Loop

# https://www.ushistory.org/us/11.asp
# Some reason cant quit out of url screen secound time


def urlGetter():
    global firstUrl
    firstUrl = UrlGrabberGUI.start()
    start()


def start():
    prompt = HeaderGrabber.findsubtitle(firstUrl)
    image_name = PromptCompiler.compile(prompt)
    url = ImageGenerator.createImage(image_name)
    ImageGUI.start(url, image_name)


while True:
    if Loop.Loop == True:
        Loop.Loop = False
        urlGetter()
    else:
        quit()
